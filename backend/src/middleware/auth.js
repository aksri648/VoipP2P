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
  apiKeyAuth
};
