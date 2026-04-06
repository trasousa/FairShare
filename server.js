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
        lastUpdated INTEGER,
        data TEXT
    )`, (err) => {
        if (err) {
             console.error("Error creating table:", err);
        } else {
             console.log("Database table 'instances' is ready.");
             // Migration: Add lastUpdated if it doesn't exist
             db.run("ALTER TABLE instances ADD COLUMN lastUpdated INTEGER", (err) => {
                 if (err) {
                     if (err.message.includes("duplicate column name")) {
                         // Column already exists, ignore
                     } else {
                         console.error("Migration error (lastUpdated):", err);
                     }
                 } else {
                     console.log("Migration: added lastUpdated column.");
                 }
             });
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
    db.all("SELECT id, name, lastAccessed, lastUpdated FROM instances ORDER BY lastAccessed DESC", [], (err, rows) => {
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
                    lastAccessed: row.lastAccessed,
                    lastUpdated: row.lastUpdated
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
    const { id, name, lastAccessed, lastUpdated: incomingLastUpdated } = instance;
    
    if (!id || !name) {
        res.status(400).json({ error: "Missing id or name" });
        return;
    }

    // Check for conflict
    db.get("SELECT lastUpdated FROM instances WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("DB Error on conflict check:", err);
            res.status(500).json({ error: err.message });
            return;
        }

        if (row && incomingLastUpdated && row.lastUpdated > incomingLastUpdated) {
            // Server has a newer version
            res.status(409).json({ error: "Conflict: A newer version exists on the server. Please refresh.", serverLastUpdated: row.lastUpdated });
            return;
        }

        const now = Date.now();
        const updatedInstance = { ...instance, lastUpdated: now, lastAccessed: now };
        const dataString = JSON.stringify(updatedInstance);

        db.run(
            `INSERT INTO instances (id, name, lastAccessed, lastUpdated, data) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET name = ?, lastAccessed = ?, lastUpdated = ?, data = ?`,
            [id, name, now, now, dataString, name, now, now, dataString],
            function(err) {
                if (err) {
                    console.error("PUT /instance error:", err);
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: "Saved successfully", id: id, lastUpdated: now });
            }
        );
    });
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

app.patch('/api/instance/:id/rename', (req, res) => {
    const id = req.params.id;
    const { name } = req.body;
    
    if (!name) {
        res.status(400).json({ error: "Missing new name" });
        return;
    }

    db.run(
        "UPDATE instances SET name = ?, lastAccessed = ? WHERE id = ?",
        [name, Date.now(), id],
        function(err) {
            if (err) {
                console.error("PATCH /instance/rename error:", err);
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: "Instance not found" });
                return;
            }
            res.json({ message: "Renamed successfully" });
        }
    );
});

// --- 5. AI Routes (provider-agnostic via fetch) ---

// Runtime AI config — can be overridden via POST /api/config/ai
const aiConfig = {
    apiKey: process.env.AI_API_KEY || '',
    provider: process.env.AI_PROVIDER || 'gemini',
    model: process.env.AI_MODEL || 'gemini-3.1-flash-lite-preview',
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
};

// GET /api/config/ai — return current config (key is masked)
app.get('/api/config/ai', (req, res) => {
    res.json({
        provider: aiConfig.provider,
        model: aiConfig.model,
        baseUrl: aiConfig.baseUrl,
        hasApiKey: !!aiConfig.apiKey,
        apiKeyHint: aiConfig.apiKey ? `${aiConfig.apiKey.slice(0, 4)}…${aiConfig.apiKey.slice(-4)}` : '',
    });
});

// POST /api/config/ai — update runtime config (not persisted to disk)
app.post('/api/config/ai', (req, res) => {
    const { apiKey, provider, model, baseUrl } = req.body;
    if (apiKey !== undefined) aiConfig.apiKey = apiKey;
    if (provider) aiConfig.provider = provider;
    if (model) aiConfig.model = model;
    if (baseUrl) aiConfig.baseUrl = baseUrl;
    res.json({ ok: true, hasApiKey: !!aiConfig.apiKey, provider: aiConfig.provider, model: aiConfig.model });
});

/**
 * Calls the configured AI provider and returns the text response.
 * Supports: Gemini (google.generativeai) and OpenAI-compatible APIs.
 */
async function callAI(systemPrompt, userMessage, imageBase64 = null, imageMimeType = null, conversationHistory = null) {
    if (!aiConfig.apiKey) throw new Error('AI API key not configured. Go to Settings → AI Configuration to add your key.');

    if (aiConfig.provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;

        // Build contents array with conversation history
        const contents = [];
        if (conversationHistory && conversationHistory.length > 0) {
            for (const msg of conversationHistory) {
                contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
            }
        }

        const parts = [];
        if (imageBase64 && imageMimeType) {
            parts.push({ inline_data: { mime_type: imageMimeType, data: imageBase64 } });
        }
        parts.push({ text: userMessage });
        contents.push({ role: 'user', parts });

        const body = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Gemini API error ${res.status}: ${err}`);
        }
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // OpenAI-compatible fallback
    const messages = [
        { role: 'system', content: systemPrompt },
    ];
    if (conversationHistory && conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
            messages.push({ role: msg.role, content: msg.content });
        }
    }
    messages.push({
        role: 'user',
        content: imageBase64
            ? [{ type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } }, { type: 'text', text: userMessage }]
            : userMessage
    });
    const res = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiConfig.apiKey}` },
        body: JSON.stringify({ model: aiConfig.model, messages, temperature: 0.3, max_tokens: 2048 })
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`AI API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

// Chat endpoint — question answering about finances
app.post('/api/ai/chat', async (req, res) => {
    const { message, context, currentUser, conversationHistory } = req.body;
    if (!message) { res.status(400).json({ error: 'Missing message' }); return; }

    const currentUserInfo = currentUser ? `\nThe person asking is "${currentUser.name}" (${currentUser.id}).` : '';
    const currentMonthInfo = context?.currentMonth ? `\nThe current month is ${context.currentMonth}.` : '';
    const systemPrompt = `You are a personal finance assistant for FairShare, a couples expense tracking app.
You have access to the user's financial data provided in context.${currentUserInfo}${currentMonthInfo}
Answer questions concisely. When referencing amounts, use the currency symbol from context.
When the user wants to add an expense, income, or savings entry, always confirm: (1) the month (default: current month shown in context), and (2) which account it belongs to (default: the current user's account). Ask these before confirming the action.
If asked to fix data issues, respond with a JSON action object like:
{"action":"delete_entries","ids":["id1","id2"]} or {"action":"none"} if no data change needed.
Always explain what you found before suggesting any action.`;

    const userMsg = context
        ? `Financial data context:\n${JSON.stringify(context, null, 2)}\n\nUser question: ${message}`
        : message;

    try {
        const reply = await callAI(systemPrompt, userMsg, null, null, conversationHistory || null);
        res.json({ reply });
    } catch (e) {
        console.error('AI chat error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Receipt scan endpoint — parse an image and extract expense fields
app.post('/api/ai/scan-receipt', async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) { res.status(400).json({ error: 'Missing imageBase64' }); return; }

    const systemPrompt = `You are a receipt parser. Extract expense data from the image and respond ONLY with a valid JSON object (no markdown, no explanation) with these fields:
{
  "amount": number,
  "date": "YYYY-MM-DD or null",
  "description": "merchant name or short description",
  "suggestedCategory": "one of: Groceries, Bar & Restaurants, Transport, Shopping, Health, Entertainment, Travel, Other",
  "currency": "3-letter code like EUR, USD or null"
}
If you cannot read the receipt, return {"error": "Cannot read receipt"}.`;

    try {
        const raw = await callAI(systemPrompt, 'Parse this receipt.', imageBase64, mimeType || 'image/jpeg');
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        res.json(parsed);
    } catch (e) {
        console.error('Receipt scan error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Expense review endpoint — analyse patterns and flag issues
app.post('/api/ai/review', async (req, res) => {
    const { context } = req.body;
    if (!context) { res.status(400).json({ error: 'Missing context' }); return; }

    const systemPrompt = `You are a financial advisor reviewing a couple's expenses in FairShare.
Analyse the data and return ONLY a JSON array of insight objects (no markdown):
[{"type":"warning|tip|info","title":"short title","body":"1-2 sentence explanation"}]
Focus on: budget overruns, unusual spikes, savings opportunities, unbalanced contributions. Max 5 insights.`;

    try {
        const raw = await callAI(systemPrompt, `Analyse this financial data:\n${JSON.stringify(context, null, 2)}`);
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const insights = JSON.parse(cleaned);
        res.json({ insights });
    } catch (e) {
        console.error('AI review error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Bank statement parse endpoint — extract transactions from a PDF or image
app.post('/api/ai/parse-statement', async (req, res) => {
    const { attachmentBase64, mimeType, owner } = req.body;
    if (!attachmentBase64) { res.status(400).json({ error: 'Missing attachmentBase64' }); return; }

    const systemPrompt = `You are a bank statement parser. Extract all transactions from this document and respond ONLY with a valid JSON array (no markdown, no explanation). Each transaction should have:
[{"date":"YYYY-MM-DD","description":"merchant or transaction description","amount":number,"suggestedCategory":"one of: Groceries, Bar & Restaurants, Transport, Shopping, Health, Entertainment, Travel, Subscriptions, Utilities, Rent, Insurance, Other"}]
Positive amounts are expenses/debits. Negative amounts are income/credits. Parse ALL transactions you can find. Be thorough.
If you cannot read the document, return {"error": "Cannot parse statement"}.`;

    try {
        const raw = await callAI(systemPrompt, 'Parse all transactions from this bank statement.', attachmentBase64, mimeType || 'application/pdf');
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        res.json({ transactions: Array.isArray(parsed) ? parsed : [], owner: owner || 'SHARED' });
    } catch (e) {
        console.error('Statement parse error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Catch-all for React Frontend
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