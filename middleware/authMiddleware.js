const { extractBearerToken, verifyAccessToken } = require('../utils/tokenVerification');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  const token = extractBearerToken(authHeader);
  if (!token) {
    return res.status(401).json({ message: 'Authorization token missing or malformed' });
  }

  const verification = verifyAccessToken(token);
  if (!verification.ok) {
    return res.status(403).json({ message: 'Invalid token' });
  }

  // If verification succeeds, attach id and role to the request
  const { id, role } = verification.decodedToken;
  req.userId = id;
  req.userRole = role || 'sender';

  return next();
};

module.exports = authenticateToken;
