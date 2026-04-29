const jwt = require('jsonwebtoken');

const getJwtSecretOrThrow = () => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || !jwtSecret.trim()) {
    throw new Error('JWT_SECRET is required and cannot be empty');
  }
  return jwtSecret;
};

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    return null;
  }
  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authorizationHeader.split(' ')[1];
  return token || null;
};

const verifyAccessToken = (token) => {
  if (!token) {
    return { ok: false, error: 'TOKEN_MISSING' };
  }

  try {
    const decodedToken = jwt.verify(token, getJwtSecretOrThrow());
    return { ok: true, decodedToken };
  } catch (error) {
    return { ok: false, error: 'TOKEN_INVALID' };
  }
};

module.exports = {
  getJwtSecretOrThrow,
  extractBearerToken,
  verifyAccessToken,
};
