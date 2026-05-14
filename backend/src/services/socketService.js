const { v4: uuidv4 } = require('uuid');
const { generateCallTokens, createRoom } = require('./liveKitService');
const { sendDataOnlyNotification } = require('./firebaseService');

const usersDB = new Map();
const activeCalls = new Map();
const userSockets = new Map();
const userTimers = new Map();

const CALL_TIMEOUT = 30000;
const RING_TIMEOUT = 45000;

const generateCallId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createOrGetUser = (callId, userData = {}) => {
  if (!usersDB.has(callId)) {
    usersDB.set(callId, {
      callId,
      clerkUserId: userData.clerkUserId || null,
      email: userData.email || null,
      phoneNumber: userData.phoneNumber || null,
      fcmToken: null,
      isOnline: false,
      isInCall: false,
      lastSeen: null,
      createdAt: new Date().toISOString()
    });
  }
  return usersDB.get(callId);
};

const getUserByCallId = (callId) => {
  return usersDB.get(callId) || null;
};

const updateUserStatus = (callId, updates) => {
  const user = usersDB.get(callId);
  if (!user) return null;

  Object.assign(user, updates);
  user.lastSeen = new Date().toISOString();
  return user;
};

const getOnlineUsers = () => {
  return Array.from(usersDB.values()).filter(u => u.isOnline);
};

const getUsers = () => {
  return usersDB.values();
};

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    socket.on('user_online', async (data) => {
      console.log('[Socket] User online:', data);
      const { userId, callId } = data;
      
      if (userId && callId) {
        createOrGetUser(callId, { clerkUserId: userId });
        
        const user = updateUserStatus(callId, {
          isOnline: true,
          lastSeen: new Date().toISOString(),
          socketId: socket.id
        });

        userSockets.set(callId, {
          socketId: socket.id,
          userId,
          callId,
          connected: true
        });

        socket.join(`user:${callId}`);
        
        broadcastUserStatus(callId, true, io);
      }
    });

    socket.on('user_offline', async (data) => {
      console.log('[Socket] User offline:', data);
      const { userId, callId } = data;
      
      if (callId) {
        updateUserStatus(callId, {
          isOnline: false,
          lastSeen: new Date().toISOString()
        });
        userSockets.delete(callId);
        broadcastUserStatus(callId, false, io);
      }
    });

    socket.on('initiate_call', async (data, callback) => {
      console.log('[Socket] Initiating call:', data);
      
      try {
        const { calleeCallId, callerCallId, callerName, timestamp } = data;
        
        const callee = getUserByCallId(calleeCallId);
        
        if (!callee) {
          callback({ success: false, error: 'User not found' });
          return;
        }

        if (!callee.isOnline) {
          callback({ success: false, error: 'User is offline' });
          
          const callerSocket = userSockets.get(callerCallId);
          if (callerSocket) {
            io.to(callerSocket.socketId).emit('user_offline', {
              callId: calleeCallId,
              message: 'User is offline'
            });
          }
          return;
        }

        if (callee.isInCall) {
          callback({ success: false, error: 'User is busy' });
          
          const callerSocket = userSockets.get(callerCallId);
          if (callerSocket) {
            io.to(callerSocket.socketId).emit('call_busy', {
              callId: calleeCallId
            });
          }
          return;
        }

        const callId = uuidv4();
        const tokens = generateCallTokens(callerCallId, calleeCallId);
        
        activeCalls.set(callId, {
          id: callId,
          callerCallId,
          calleeCallId,
          callerName,
          roomName: tokens.roomName,
          callerToken: tokens.callerToken,
          calleeToken: tokens.calleeToken,
          status: 'ringing',
          created: timestamp,
          updated: Date.now()
        });

        updateUserStatus(calleeCallId, { isInCall: true });
        updateUserStatus(callerCallId, { isInCall: true });

        const calleeSocket = userSockets.get(calleeCallId);
        if (calleeSocket) {
          io.to(calleeSocket.socketId).emit('incoming_call', {
            callId,
            callerId: callerCallId,
            callerName: callerName || `User ${callerCallId}`,
            roomName: tokens.roomName,
            roomToken: tokens.calleeToken,
            timestamp
          });

          if (callee.fcmToken) {
            await sendDataOnlyNotification(callee.fcmToken, {
              type: 'incoming_call',
              callId,
              callerId: callerCallId,
              callerName: callerName || `User ${callerCallId}`,
              roomName: tokens.roomName,
              roomToken: tokens.calleeToken,
              timestamp: String(timestamp)
            });
          }
        }

        startCallTimeout(callId, io);

        callback({ 
          success: true, 
          callId,
          roomName: tokens.roomName 
        });

      } catch (error) {
        console.error('[Socket] Initiate call error:', error);
        callback({ success: false, error: error.message });
      }
    });

    socket.on('accept_call', async (data) => {
      console.log('[Socket] Accept call:', data);
      
      try {
        const { callId, roomName, roomToken } = data;
        const call = activeCalls.get(callId);
        
        if (!call) {
          io.to(socket.id).emit('call_timeout', { callId });
          return;
        }

        const callerSocket = userSockets.get(call.callerCallId);
        if (callerSocket) {
          io.to(callerSocket.socketId).emit('call_accepted', {
            callId,
            roomName: call.roomName,
            roomToken: call.callerToken
          });
        }

        clearUserTimer(callId);

        io.to(socket.id).emit('call_accepted', {
          callId,
          roomName: call.roomName,
          roomToken: call.callerToken
        });

      } catch (error) {
        console.error('[Socket] Accept call error:', error);
      }
    });

    socket.on('reject_call', async (data) => {
      console.log('[Socket] Reject call:', data);
      
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        
        if (call) {
          const callerSocket = userSockets.get(call.callerCallId);
          if (callerSocket) {
            io.to(callerSocket.socketId).emit('call_rejected', {
              callId,
              calleeId: call.calleeCallId
            });
          }

          activeCalls.delete(callId);
          
          updateUserStatus(call.callerCallId, { isInCall: false });
          updateUserStatus(call.calleeCallId, { isInCall: false });
        }
      } catch (error) {
        console.error('[Socket] Reject call error:', error);
      }
    });

    socket.on('end_call', async (data) => {
      console.log('[Socket] End call:', data);
      
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        
        if (call) {
          const callerSocket = userSockets.get(call.callerCallId);
          const calleeSocket = userSockets.get(call.calleeCallId);

          if (callerSocket) {
            io.to(callerSocket.socketId).emit('call_ended', { callId });
          }
          
          if (calleeSocket && calleeSocket.socketId !== socket.id) {
            io.to(calleeSocket.socketId).emit('call_ended', { callId });
          }

          activeCalls.delete(callId);

          updateUserStatus(call.callerCallId, { isInCall: false });
          updateUserStatus(call.calleeCallId, { isInCall: false });
        }
      } catch (error) {
        console.error('[Socket] End call error:', error);
      }
    });

    socket.on('call_missed', async (data) => {
      console.log('[Socket] Call missed:', data);
      
      try {
        const { calleeCallId, callerCallId } = data;
        
        const callerSocket = userSockets.get(callerCallId);
        if (callerSocket) {
          io.to(callerSocket.socketId).emit('call_missed', {
            calleeId: calleeCallId
          });
        }

        updateUserStatus(calleeCallId, { isInCall: false });
        updateUserStatus(callerCallId, { isInCall: false });
      } catch (error) {
        console.error('[Socket] Call missed error:', error);
      }
    });

    socket.on('call_state_update', async (data) => {
      console.log('[Socket] Call state update:', data);
      
      const { callId, state } = data;
      const call = activeCalls.get(callId);
      
      if (call) {
        call.status = state;
        call.updated = Date.now();
      }
    });

    socket.on('disconnect', async (reason) => {
      console.log('[Socket] Client disconnected:', socket.id, reason);
      
      for (const [callId, userData] of userSockets.entries()) {
        if (userData.socketId === socket.id) {
          updateUserStatus(callId, {
            isOnline: false,
            lastSeen: new Date().toISOString()
          });
          
          userSockets.delete(callId);
          broadcastUserStatus(callId, false, io);
          break;
        }
      }
    });

    socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });
  });
};

const broadcastUserStatus = (callId, isOnline, io) => {
  for (const [userCallId, userData] of userSockets.entries()) {
    if (userCallId !== callId) {
      io.to(userData.socketId).emit('user_online', {
        callId,
        isOnline
      });
    }
  }
};

const startCallTimeout = (callId, io) => {
  const timer = setTimeout(async () => {
    const call = activeCalls.get(callId);
    
    if (call && call.status === 'ringing') {
      console.log('[Socket] Call timeout:', callId);
      
      const calleeSocket = userSockets.get(call.calleeCallId);
      if (calleeSocket) {
        io.to(calleeSocket.socketId).emit('call_timeout', { callId });
      }

      const callerSocket = userSockets.get(call.callerCallId);
      if (callerSocket) {
        io.to(callerSocket.socketId).emit('call_timeout', { callId });
      }

      activeCalls.delete(callId);

      updateUserStatus(call.callerCallId, { isInCall: false });
      updateUserStatus(call.calleeCallId, { isInCall: false });
    }
  }, RING_TIMEOUT);

  userTimers.set(callId, timer);
};

const clearUserTimer = (callId) => {
  const timer = userTimers.get(callId);
  if (timer) {
    clearTimeout(timer);
    userTimers.delete(callId);
  }
};

module.exports = setupSocketHandlers;
module.exports.getUserByCallId = getUserByCallId;
module.exports.updateUserStatus = updateUserStatus;
module.exports.getOnlineUsers = getOnlineUsers;
module.exports.createOrGetUser = createOrGetUser;
module.exports.generateCallId = generateCallId;
module.exports.getUsers = getUsers;