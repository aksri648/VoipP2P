const express = require('express');
const { apiKeyAuth } = require('../middleware/auth');
const {
  getUserById,
  updateUserStatus,
  getOnlineUsers,
  createOrGetUser
} = require('../services/socketService');
const { sendDataOnlyNotification } = require('../services/firebaseService');

const router = express.Router();

router.post('/users/register', apiKeyAuth, async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || typeof userId !== 'string' || userId.length < 2 || userId.length > 30) {
      return res.status(400).json({ error: 'User ID must be 2-30 characters' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
      return res.status(400).json({ error: 'User ID can only contain letters, numbers, hyphens, and underscores' });
    }

    const existing = getUserById(userId);
    if (existing && existing.isOnline) {
      return res.status(409).json({ error: 'User ID already in use' });
    }

    createOrGetUser(userId);
    const user = updateUserStatus(userId, { fcmToken });

    res.json({ success: true, user: { userId: user.userId, isOnline: user.isOnline } });
  } catch (error) {
    console.error('[API] Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:userId/fcm', apiKeyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token required' });
    }

    const user = updateUserStatus(userId, { fcmToken });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[API] Update FCM error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/online', apiKeyAuth, async (req, res) => {
  try {
    const onlineUsers = getOnlineUsers().map(u => ({
      userId: u.userId,
      isOnline: u.isOnline,
      isInCall: u.isInCall
    }));

    res.json({ success: true, users: onlineUsers });
  } catch (error) {
    console.error('[API] Online users error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:userId', apiKeyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,
        isOnline: user.isOnline,
        isInCall: user.isInCall,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('[API] Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/notify', apiKeyAuth, async (req, res) => {
  try {
    const { userId, type, data } = req.body;
    const user = getUserById(userId);

    if (!user || !user.fcmToken) {
      return res.status(404).json({ error: 'User or FCM token not found' });
    }

    await sendDataOnlyNotification(user.fcmToken, { type, ...data });
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
