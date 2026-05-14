const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    req.user = {
      id: token,
      authenticated: true
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token) {
      req.user = {
        id: token,
        authenticated: true
      };
    }
  }
  
  next();
};

const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY || 'development-key';
  
  if (apiKey === validApiKey) {
    next();
  } else {
    res.status(403).json({ error: 'Invalid API key' });
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
  apiKeyAuth
};