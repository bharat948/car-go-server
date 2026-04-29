const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-jwt-secret-must-be-long-enough-32chars';

const { extractBearerToken, verifyAccessToken } = require('../utils/tokenVerification');

test('extractBearerToken returns raw token after Bearer ', () => {
  assert.strictEqual(extractBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
});

test('extractBearerToken rejects missing or malformed Authorization', () => {
  assert.strictEqual(extractBearerToken(), null);
  assert.strictEqual(extractBearerToken('Token abc'), null);
});

test('verifyAccessToken validates a signed JWT', () => {
  const token = jwt.sign({ id: 'u1', role: 'courier' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const r = verifyAccessToken(token);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.decodedToken.id, 'u1');
  assert.strictEqual(r.decodedToken.role, 'courier');
});

test('verifyAccessToken rejects bad token', () => {
  const r = verifyAccessToken('not-a-jwt');
  assert.strictEqual(r.ok, false);
});
