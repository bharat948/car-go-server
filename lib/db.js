const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(DB_PATH);

// Ensure drivers table exists in normal runtime paths.
db.exec(`
  CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    userId TEXT,
    lat REAL,
    lng REAL,
    isOnline INTEGER,
    lastUpdated TEXT
  );
`);

// --------------- packages ---------------

function getPackages() {
  return db.prepare('SELECT * FROM packages').all();
}

function getPackageById(id) {
  return db.prepare('SELECT * FROM packages WHERE id = ?').get(id) || null;
}

function savePackage(pkg) {
  const stmt = db.prepare(`
    INSERT INTO packages (
      id, userId, userName, pickupLocation, destination, 
      estimatedDeliveryTime, estimatedPrice, deliverTo, createdOn, 
      picklat, picklng, destlat, destlng, status, acceptedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    pkg.id,
    pkg.userId,
    pkg.userName,
    pkg.pickupLocation,
    pkg.destination,
    pkg.estimatedDeliveryTime,
    pkg.estimatedPrice,
    pkg.deliverTo,
    pkg.createdOn,
    pkg.picklat,
    pkg.picklng,
    pkg.destlat,
    pkg.destlng,
    pkg.status,
    pkg.acceptedBy || null
  );
  return pkg;
}

function updatePackage(id, updates) {
  const fields = Object.keys(updates);
  if (fields.length === 0) return getPackageById(id);

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);
  values.push(id);

  const stmt = db.prepare(`UPDATE packages SET ${setClause} WHERE id = ?`);
  const info = stmt.run(...values);

  if (info.changes === 0) return null;
  return getPackageById(id);
}

function acceptPendingPackageAtomically(id, courierId) {
  const stmt = db.prepare(`
    UPDATE packages
    SET status = 'accepted', acceptedBy = ?
    WHERE id = ?
      AND COALESCE(status, 'pending') = 'pending'
      AND acceptedBy IS NULL
  `);
  const info = stmt.run(courierId, id);
  if (info.changes === 0) {
    return null;
  }
  return getPackageById(id);
}

function deletePackage(id) {
  const stmt = db.prepare('DELETE FROM packages WHERE id = ?');
  const info = stmt.run(id);
  return info.changes > 0;
}

// --------------- users ---------------

function getUsers() {
  const users = db.prepare('SELECT * FROM users').all();
  return users.map(u => ({ ...u, friends: JSON.parse(u.friends || '[]') }));
}

function getUserByUsername(username) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return null;
  return { ...user, friends: JSON.parse(user.friends || '[]') };
}

function getUserById(id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return null;
  return { ...user, friends: JSON.parse(user.friends || '[]') };
}

function saveUser(user) {
  const stmt = db.prepare(`
    INSERT INTO users (id, username, password, role, friends)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    user.id,
    user.username,
    user.password,
    user.role,
    JSON.stringify(user.friends || [])
  );
  return user;
}

// --------------- drivers ---------------

function getDriverById(id) {
  return db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) || null;
}

function upsertDriverLocation(driver) {
  const stmt = db.prepare(`
    INSERT INTO drivers (id, userId, lat, lng, isOnline, lastUpdated)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      userId = excluded.userId,
      lat = excluded.lat,
      lng = excluded.lng,
      isOnline = excluded.isOnline,
      lastUpdated = excluded.lastUpdated
  `);

  stmt.run(
    driver.id,
    driver.userId || null,
    driver.lat,
    driver.lng,
    driver.isOnline,
    driver.lastUpdated
  );

  return getDriverById(driver.id);
}

module.exports = {
  getPackages,
  getPackageById,
  savePackage,
  updatePackage,
  acceptPendingPackageAtomically,
  deletePackage,
  getUsers,
  getUserByUsername,
  getUserById,
  saveUser,
  getDriverById,
  upsertDriverLocation,
};

