import express from 'express';
import sqlite3 from 'sqlite3';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/fairshare.db';

// --- 1. Ensure Data Directory Exists ---
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)){
    console.log(`Creating data directory at: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
}

// --- 2. Initialize SQLite Database ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('CRITICAL: Error opening database at ' + DB_PATH, err);
        process.exit(1);
    } else {
        console.log(`Connected to SQLite database at ${DB_PATH}`);
        initDb();
    }
});

function initDb() {
    db.run(`CREATE TABLE IF NOT EXISTS instances (
        id TEXT PRIMARY KEY,
        name TEXT,
        lastAccessed INTEGER,
        data TEXT
    )`, (err) => {
        if (err) {
             console.error("Error creating table:", err);
        } else {
             console.log("Database table 'instances' is ready.");
        }
    });
}

// --- 3. Middleware ---
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- 4. API Routes ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbPath: DB_PATH });
});

app.get('/api/instances', (req, res) => {
    db.all("SELECT id, name, lastAccessed FROM instances ORDER BY lastAccessed DESC", [], (err, rows) => {
        if (err) {
            console.error("GET /instances error:", err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/instance/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM instances WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error(`GET /instance/${id} error:`, err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            try {
                const fullInstance = {
                    ...JSON.parse(row.data),
                    id: row.id,
                    name: row.name,
                    lastAccessed: row.lastAccessed
                };
                res.json(fullInstance);
            } catch (parseErr) {
                console.error("JSON Parse error for instance:", id, parseErr);
                res.status(500).json({ error: "Data corruption detected" });
            }
        } else {
            res.status(404).json({ error: "Instance not found" });
        }
    });
});

app.put('/api/instance', (req, res) => {
    const instance = req.body;
    const { id, name, lastAccessed } = instance;
    
    if (!id || !name) {
        res.status(400).json({ error: "Missing id or name" });
        return;
    }

    const dataString = JSON.stringify(instance);

    db.run(
        `INSERT INTO instances (id, name, lastAccessed, data) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = ?, lastAccessed = ?, data = ?`,
        [id, name, lastAccessed, dataString, name, lastAccessed, dataString],
        function(err) {
            if (err) {
                console.error("PUT /instance error:", err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: "Saved successfully", id: id });
        }
    );
});

app.delete('/api/instance/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM instances WHERE id = ?", [id], function(err) {
        if (err) {
            console.error("DELETE /instance error:", err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Deleted successfully" });
    });
});

// --- 5. Catch-all for React Frontend ---
app.get('*', (req, res) => {
    // If we are in dev mode (no dist folder), this might fail, but the proxy handles it.
    // In production/start mode, this serves index.html
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('Backend is running. In development, access via port 5173.');
    }
});

app.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`Backend Server running on port ${PORT}`);
    console.log(`Database Location: ${path.resolve(DB_PATH)}`);
    console.log(`-------------------------------------------`);
});