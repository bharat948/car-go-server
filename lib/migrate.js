const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_JSON_PATH = path.join(__dirname, '..', 'db.json');
const DB_SQLITE_PATH = path.join(__dirname, '..', 'database.sqlite');

function migrate() {
    console.log('Starting migration...');

    // 1. Read existing JSON data
    if (!fs.existsSync(DB_JSON_PATH)) {
        console.error('db.json not found!');
        return;
    }
    const data = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));

    // 2. Initialize SQLite Database
    const db = new Database(DB_SQLITE_PATH);

    // 3. Create Tables
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      friends TEXT -- Store as JSON string
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      pickupLocation TEXT,
      destination TEXT,
      estimatedDeliveryTime TEXT,
      estimatedPrice TEXT,
      deliverTo TEXT,
      createdOn TEXT,
      picklat REAL,
      picklng REAL,
      destlat REAL,
      destlng REAL,
      status TEXT,
      acceptedBy TEXT,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(acceptedBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      userId TEXT,
      lat REAL,
      lng REAL,
      isOnline INTEGER,
      lastUpdated TEXT
    );
  `);

    // 4. Migrate Users
    const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, password, role, friends)
    VALUES (?, ?, ?, ?, ?)
  `);

    const migrateUsers = db.transaction((users) => {
        for (const user of users) {
            insertUser.run(
                user.id,
                user.username,
                user.password,
                user.role,
                JSON.stringify(user.friends || [])
            );
        }
    });

    if (data.users) {
        migrateUsers(data.users);
        console.log(`Migrated ${data.users.length} users.`);
    }

    // 5. Migrate Packages
    const insertPackage = db.prepare(`
    INSERT OR IGNORE INTO packages (
      id, userId, userName, pickupLocation, destination, 
      estimatedDeliveryTime, estimatedPrice, deliverTo, createdOn, 
      picklat, picklng, destlat, destlng, status, acceptedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const migratePackages = db.transaction((packages) => {
        for (const pkg of packages) {
            insertPackage.run(
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
        }
    });

    if (data.packages) {
        migratePackages(data.packages);
        console.log(`Migrated ${data.packages.length} packages.`);
    }

    console.log('Migration completed successfully.');
    db.close();
}

if (require.main === module) {
    migrate();
}

module.exports = {
    migrate,
};
