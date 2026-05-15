const { v4: uuidv4 } = require('uuid');
const { sendDataOnlyNotification } = require('./firebaseService');

const usersDB = new Map();
const activeCalls = new Map();
const userSockets = new Map();

const RING_TIMEOUT = 45000;

const generateCallId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createOrGetUser = (userId) => {
  if (!usersDB.has(userId)) {
    usersDB.set(userId, {
      userId,
      fcmToken: null,
      isOnline: false,
      isInCall: false,
      lastSeen: null,
      createdAt: new Date().toISOString()
    });
  }
  return usersDB.get(userId);
};

const getUserById = (userId) => {
  return usersDB.get(userId) || null;
};

const updateUserStatus = (userId, updates) => {
  const user = usersDB.get(userId);
  if (!user) return null;
  Object.assign(user, updates);
  user.lastSeen = new Date().toISOString();
  return user;
};

const getOnlineUsers = () => {
  return Array.from(usersDB.values()).filter(u => u.isOnline);
};

const getUsers = function* () {
  yield* usersDB.values();
};

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    socket.on('register', (data) => {
      const { userId, fcmToken } = data;
      if (!userId) return;

      const alreadyOnline = userSockets.has(userId);
      if (alreadyOnline) {
        socket.emit('register:error', { message: 'User ID already taken' });
        return;
      }

      createOrGetUser(userId);
      updateUserStatus(userId, {
        isOnline: true,
        fcmToken: fcmToken || null,
        socketId: socket.id
      });

      userSockets.set(userId, {
        socketId: socket.id,
        userId,
        connected: true
      });

      socket.join(`user:${userId}`);
      socket.userId = userId;

      socket.emit('register:ok', { userId });
      broadcastUserStatus(userId, true, io);
    });

    socket.on('call:offer', async (data) => {
      const { calleeId, sdp, callerId } = data;
      const callee = getUserById(calleeId);

      if (!callee) {
        socket.emit('call:error', { message: 'User not found' });
        return;
      }

      const callId = uuidv4();
      activeCalls.set(callId, {
        id: callId,
        callerId,
        calleeId,
        status: 'ringing',
        createdAt: Date.now()
      });

      updateUserStatus(callerId, { isInCall: true });
      updateUserStatus(calleeId, { isInCall: true });

      const calleeSocket = userSockets.get(calleeId);
      if (calleeSocket) {
        io.to(calleeSocket.socketId).emit('incoming_call', {
          callId,
          callerId,
          sdp,
          callerOnline: true
        });
      }

      if (callee.fcmToken) {
        await sendDataOnlyNotification(callee.fcmToken, {
          type: 'incoming_call',
          callId,
          callerId,
          sdp
        }).catch(() => {});
      }

      startCallTimeout(callId, io);

      socket.emit('call:offered', { callId });
    });

    socket.on('call:answer', (data) => {
      const { callId, sdp } = data;
      const call = activeCalls.get(callId);
      if (!call) return;

      const callerSocket = userSockets.get(call.callerId);
      if (callerSocket) {
        io.to(callerSocket.socketId).emit('call:answered', {
          callId,
          sdp
        });
      }

      clearCallTimer(callId);
    });

    socket.on('ice:candidate', (data) => {
      const { callId, candidate, targetId } = data;
      const targetSocket = userSockets.get(targetId);
      if (targetSocket) {
        io.to(targetSocket.socketId).emit('ice:candidate', {
          callId,
          candidate
        });
      }
    });

    socket.on('call:reject', (data) => {
      const { callId } = data;
      const call = activeCalls.get(callId);
      if (!call) return;

      const callerSocket = userSockets.get(call.callerId);
      if (callerSocket) {
        io.to(callerSocket.socketId).emit('call:rejected', { callId });
      }

      activeCalls.delete(callId);
      updateUserStatus(call.callerId, { isInCall: false });
      updateUserStatus(call.calleeId, { isInCall: false });
    });

    socket.on('call:end', (data) => {
      const { callId } = data;
      const call = activeCalls.get(callId);
      if (!call) return;

      const callerSocket = userSockets.get(call.callerId);
      const calleeSocket = userSockets.get(call.calleeId);

      if (callerSocket && callerSocket.socketId !== socket.id) {
        io.to(callerSocket.socketId).emit('call:ended', { callId });
      }
      if (calleeSocket && calleeSocket.socketId !== socket.id) {
        io.to(calleeSocket.socketId).emit('call:ended', { callId });
      }

      activeCalls.delete(callId);
      updateUserStatus(call.callerId, { isInCall: false });
      updateUserStatus(call.calleeId, { isInCall: false });
    });

    socket.on('call:missed', (data) => {
      const { callId } = data;
      const call = activeCalls.get(callId);
      if (!call) return;

      const callerSocket = userSockets.get(call.callerId);
      if (callerSocket) {
        io.to(callerSocket.socketId).emit('call:missed', { callId });
      }

      activeCalls.delete(callId);
      updateUserStatus(call.callerId, { isInCall: false });
      updateUserStatus(call.calleeId, { isInCall: false });
    });

    socket.on('disconnect', () => {
      const userId = socket.userId;
      if (!userId) return;

      console.log('[Socket] Client disconnected:', socket.id, 'user:', userId);

      updateUserStatus(userId, {
        isOnline: false,
        lastSeen: new Date().toISOString()
      });

      userSockets.delete(userId);
      broadcastUserStatus(userId, false, io);

      for (const [callId, call] of activeCalls) {
        if (call.callerId === userId || call.calleeId === userId) {
          const otherId = call.callerId === userId ? call.calleeId : call.callerId;
          const otherSocket = userSockets.get(otherId);
          if (otherSocket) {
            io.to(otherSocket.socketId).emit('call:ended', { callId, reason: 'peer_disconnected' });
          }
          activeCalls.delete(callId);
          updateUserStatus(otherId, { isInCall: false });
        }
      }
    });
  });
};

const broadcastUserStatus = (userId, isOnline, io) => {
  for (const [id, userData] of userSockets.entries()) {
    if (id !== userId) {
      io.to(userData.socketId).emit('user:status', { userId, isOnline });
    }
  }
};

const startCallTimeout = (callId, io) => {
  const timer = setTimeout(() => {
    const call = activeCalls.get(callId);
    if (call && call.status === 'ringing') {
      const calleeSocket = userSockets.get(call.calleeId);
      const callerSocket = userSockets.get(call.callerId);

      if (calleeSocket) {
        io.to(calleeSocket.socketId).emit('call:timeout', { callId });
      }
      if (callerSocket) {
        io.to(callerSocket.socketId).emit('call:timeout', { callId });
      }

      activeCalls.delete(callId);
      updateUserStatus(call.callerId, { isInCall: false });
      updateUserStatus(call.calleeId, { isInCall: false });
    }
  }, RING_TIMEOUT);

  activeCalls.get(callId)._timer = timer;
};

const clearCallTimer = (callId) => {
  const call = activeCalls.get(callId);
  if (call && call._timer) {
    clearTimeout(call._timer);
    delete call._timer;
  }
};

module.exports = setupSocketHandlers;
module.exports.getUserById = getUserById;
module.exports.updateUserStatus = updateUserStatus;
module.exports.getOnlineUsers = getOnlineUsers;
module.exports.createOrGetUser = createOrGetUser;
module.exports.getUsers = getUsers;
