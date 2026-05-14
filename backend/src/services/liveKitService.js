const { AccessToken, VideoGrant, RoomEventClient } = require('livekit-server-sdk');
const { v4: uuidv4 } = require('uuid');

let liveKitClient = null;
let isInitialized = false;

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'your-api-key';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'your-api-secret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://your-livekit-url.livekit.cloud';

const initializeLiveKit = () => {
  if (isInitialized) {
    return liveKitClient;
  }

  try {
    liveKitClient = new RoomEventClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    isInitialized = true;
    console.log('[LiveKit] Initialized successfully');
    return liveKitClient;
  } catch (error) {
    console.error('[LiveKit] Initialization error:', error.message);
    return null;
  }
};

const createRoom = async (roomName) => {
  const roomId = roomName || `call-${uuidv4()}`;
  
  console.log('[LiveKit] Creating room:', roomId);
  
  return {
    roomName: roomId,
    created: new Date().toISOString()
  };
};

const generateToken = (userId, roomName, identity, metadata = {}) => {
  try {
    const at = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      {
        identity: identity || `user-${userId}`,
        name: userId,
        metadata: JSON.stringify(metadata)
      }
    );

    const videoGrant = new VideoGrant({
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    at.addGrant(videoGrant);

    const token = at.toJwt();
    console.log('[LiveKit] Token generated for:', identity);

    return token;
  } catch (error) {
    console.error('[LiveKit] Token generation error:', error.message);
    throw error;
  }
};

const generateCallerToken = (callerId, roomName) => {
  return generateToken(callerId, roomName, `caller-${callerId}`, {
    role: 'caller',
    callId: callerId
  });
};

const generateCalleeToken = (calleeId, roomName) => {
  return generateToken(calleeId, roomName, `callee-${calleeId}`, {
    role: 'callee',
    callId: calleeId
  });
};

const generateCallTokens = (callerId, calleeId) => {
  const roomName = `call-${uuidv4()}-${Date.now()}`;
  
  const callerToken = generateToken(callerId, roomName, `user-${callerId}`, {
    role: 'caller',
    callId: callerId
  });
  
  const calleeToken = generateToken(calleeId, roomName, `user-${calleeId}`, {
    role: 'callee',
    callId: calleeId
  });

  return {
    roomName,
    callerToken,
    calleeToken,
    created: new Date().toISOString()
  };
};

const closeRoom = async (roomName) => {
  console.log('[LiveKit] Room closed:', roomName);
  return { roomName, closed: true };
};

const getRoomParticipants = async (roomName) => {
  console.log('[LiveKit] Getting participants for room:', roomName);
  return [];
};

module.exports = {
  initializeLiveKit,
  createRoom,
  generateToken,
  generateCallerToken,
  generateCalleeToken,
  generateCallTokens,
  closeRoom,
  getRoomParticipants,
  LIVEKIT_URL
};