const express = require('express');
const { apiKeyAuth } = require('../middleware/auth');
const { 
  getUserByCallId, 
  updateUserStatus, 
  getOnlineUsers, 
  createOrGetUser,
  generateCallId,
  getUserByClerkId 
} = require('../services/socketService');
const { generateCallTokens } = require('../services/liveKitService');
const { sendDataOnlyNotification } = require('../services/firebaseService');

const router = express.Router();

router.post('/users', apiKeyAuth, async (req, res) => {
  try {
    const { clerkUserId, email, phoneNumber, deviceInfo } = req.body;
    
    let existingUser = null;
    if (clerkUserId) {
      for (const [callId, user] of require('../services/socketService').getUsers()) {
        if (user.clerkUserId === clerkUserId) {
          existingUser = user;
          break;
        }
      }
    }

    if (existingUser) {
      return res.json({ 
        success: true, 
        user: {
          callId: existingUser.callId,
          clerkUserId: existingUser.clerkUserId,
          email: existingUser.email,
          phoneNumber: existingUser.phoneNumber
        }
      });
    }

    const callId = generateCallId();
    createOrGetUser(callId, {
      clerkUserId,
      email,
      phoneNumber,
      deviceInfo
    });

    res.json({
      success: true,
      user: {
        callId,
        clerkUserId,
        email,
        phoneNumber
      }
    });
  } catch (error) {
    console.error('[API] Create user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/users/:callId', apiKeyAuth, async (req, res) => {
  try {
    const { callId } = req.params;
    const user = getUserByCallId(callId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('[API] Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:callId/status', apiKeyAuth, async (req, res) => {
  try {
    const { callId } = req.params;
    const { isOnline, isInCall, fcmToken } = req.body;
    
    const updates = {};
    if (isOnline !== undefined) updates.isOnline = isOnline;
    if (isInCall !== undefined) updates.isInCall = isInCall;
    if (fcmToken) updates.fcmToken = fcmToken;
    if (req.body.lastSeen) updates.lastSeen = req.body.lastSeen;
    
    const user = updateUserStatus(callId, updates);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('[API] Update status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:callId/fcm', apiKeyAuth, async (req, res) => {
  try {
    const { callId } = req.params;
    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token required' });
    }

    const user = updateUserStatus(callId, { fcmToken });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[API] Update FCM error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:callId/profile', apiKeyAuth, async (req, res) => {
  try {
    const { callId } = req.params;
    const user = getUserByCallId(callId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      profile: {
        callId: user.callId,
        clerkUserId: user.clerkUserId,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isOnline: user.isOnline,
        isInCall: user.isInCall,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[API] Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:callId/profile', apiKeyAuth, async (req, res) => {
  try {
    const { callId } = req.params;
    const { email, phoneNumber } = req.body;
    
    const user = updateUserStatus(callId, { email, phoneNumber });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, profile: user });
  } catch (error) {
    console.error('[API] Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/users', apiKeyAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    if (status === 'online') {
      const onlineUsers = getOnlineUsers();
      return res.json({ success: true, users: onlineUsers });
    }

    res.json({ success: true, users: [] });
  } catch (error) {
    console.error('[API] Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', apiKeyAuth, async (req, res) => {
  try {
    const users = Array.from(require('../services/socketService').getUsers?.() || []);
    const onlineCount = users.filter(u => u.isOnline).length;
    const inCallCount = users.filter(u => u.isInCall).length;
    
    res.json({ 
      success: true, 
      stats: {
        totalUsers: users.length,
        onlineUsers: onlineCount,
        usersInCall: inCallCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API] Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/call/token', apiKeyAuth, async (req, res) => {
  try {
    const { callerId, calleeId } = req.body;
    
    if (!callerId || !calleeId) {
      return res.status(400).json({ error: 'callerId and calleeId required' });
    }

    const caller = getUserByCallId(callerId);
    const callee = getUserByCallId(calleeId);

    if (!caller || !callee) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tokens = generateCallTokens(callerId, calleeId);

    res.json({
      success: true,
      roomName: tokens.roomName,
      callerToken: tokens.callerToken,
      calleeToken: tokens.calleeToken
    });
  } catch (error) {
    console.error('[API] Generate token error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/notify', apiKeyAuth, async (req, res) => {
  try {
    const { callId, type, data } = req.body;
    
    const user = getUserByCallId(callId);
    
    if (!user || !user.fcmToken) {
      return res.status(404).json({ error: 'User or FCM token not found' });
    }

    const notificationData = {
      type,
      ...data
    };

    await sendDataOnlyNotification(user.fcmToken, notificationData);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Notify error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString() 
  });
});

module.exports = router;