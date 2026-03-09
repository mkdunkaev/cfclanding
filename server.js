/**
 * CBC Academy — Landing Page Backend
 * Serves index.html and saves email signups to SQLite
 *
 * Usage:
 *   npm install
 *   node server.js
 *
 * Then open http://localhost:3000
 */

const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const Database = require('better-sqlite3');

const PORT    = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'signups.db');

/* ── Database setup ──────────────────────────────────── */
const db = new Database(DB_FILE);

db.exec(`
    CREATE TABLE IF NOT EXISTS signups (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT    NOT NULL,
        email     TEXT    NOT NULL,
        phone     TEXT    NOT NULL DEFAULT '',
        created_at TEXT   NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_email ON signups(email);
`);

try { db.exec(`ALTER TABLE signups ADD COLUMN phone TEXT NOT NULL DEFAULT ''`); } catch(e) {}

const insertSignup = db.prepare(
    `INSERT OR IGNORE INTO signups (name, email, phone) VALUES (?, ?, ?)`
);

/* ── HTTP server ─────────────────────────────────────── */
const server = http.createServer((req, res) => {
    // ── POST /api/signup ──────────────────────────────
    if (req.method === 'POST' && req.url === '/api/signup') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { name, email, phone } = JSON.parse(body);

                if (!name || !email || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Invalid input' }));
                }

                const info = insertSignup.run(name.trim(), email.trim().toLowerCase(), phone.trim());
                const isNew = info.changes > 0;

                console.log(`[signup] ${isNew ? 'NEW' : 'DUP'} | ${name} <${email}> ${phone}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, new: isNew }));

            } catch (err) {
                console.error('[signup error]', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Server error' }));
            }
        });
        return;
    }

    // ── GET /api/signups  (view all signups) ──────────
    if (req.method === 'GET' && req.url === '/api/signups') {
        const rows = db.prepare('SELECT * FROM signups ORDER BY id DESC').all();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(rows, null, 2));
    }

    // ── Serve static files ────────────────────────────
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext  = path.extname(filePath);
    const mime = {
        '.html': 'text/html; charset=utf-8',
        '.css':  'text/css',
        '.js':   'application/javascript',
        '.ico':  'image/x-icon',
        '.png':  'image/png',
        '.jpg':  'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg':  'image/svg+xml',
        '.woff2':'font/woff2',
    }[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`\n✦ CBC Academy server running at http://localhost:${PORT}\n`);
    console.log(`  Database : ${DB_FILE}`);
    console.log(`  Signups  : http://localhost:${PORT}/api/signups\n`);
});
