import 'dotenv/config';
import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { runResearch } from './research.js';
import { startDeviceFlow, pollDeviceFlow, getAuthStatus, clearToken, readStoredToken, getUserRepos } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// File paths
const REPOS_FILE = path.join(__dirname, 'repos.json');
const MODELS_FILE = path.join(__dirname, 'model-deprecation-map.json');
const WORKFLOW_FILE = path.join(__dirname, '.github', 'workflows', 'weekly-updater.yml');

// Helper to read JSON
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
// Helper to write JSON
const writeJson = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

// --- API Endpoints ---

// Repositories
app.get('/api/repos', (req, res) => {
  try {
    res.json(readJson(REPOS_FILE));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read repositories' });
  }
});

app.post('/api/repos', (req, res) => {
  try {
    writeJson(REPOS_FILE, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save repositories' });
  }
});

// Model Deprecation Map
app.get('/api/models', (req, res) => {
  try {
    res.json(readJson(MODELS_FILE));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read model map' });
  }
});

app.post('/api/models', (req, res) => {
  try {
    writeJson(MODELS_FILE, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save model map' });
  }
});

// Schedule Configuration
app.get('/api/schedule', (req, res) => {
  try {
    const yamlContent = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    // Basic regex to extract cron string
    const cronMatch = yamlContent.match(/- cron:\s*['"](.+?)['"]/);
    if (cronMatch && cronMatch[1]) {
      res.json({ cron: cronMatch[1] });
    } else {
      res.json({ cron: '0 0 * * 0' }); // Fallback default
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read workflow schedule' });
  }
});

app.post('/api/schedule', (req, res) => {
  try {
    const { cron } = req.body;
    if (!cron) return res.status(400).json({ error: 'Missing cron expression' });

    let yamlContent = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    // Replace the cron line
    yamlContent = yamlContent.replace(/- cron:\s*['"].+?['"]/, `- cron: '${cron}'`);
    
    fs.writeFileSync(WORKFLOW_FILE, yamlContent, 'utf8');
    res.json({ success: true, cron });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save workflow schedule' });
  }
});

// Research Endpoint — fetches deprecation data from provider docs
app.post('/api/research', async (req, res) => {
  try {
    console.log('\n🔬 Research triggered from dashboard...');
    const results = await runResearch();

    // Merge with existing map (don't overwrite manual entries)
    const existing = readJson(MODELS_FILE);
    const merged   = { ...results, ...existing };
    writeJson(MODELS_FILE, merged);

    res.json({ success: true, found: Object.keys(results).length, map: merged });
  } catch (err) {
    console.error('Research error:', err);
    res.status(500).json({ error: 'Research failed: ' + err.message });
  }
});

// ---- Auth Endpoints (GitHub Device Flow) ----

// GET /api/auth/status — check if already authenticated
app.get('/api/auth/status', (req, res) => {
  res.json(getAuthStatus());
});

// POST /api/auth/start — start the device flow, get user_code
app.post('/api/auth/start', async (req, res) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId || clientId === 'your_client_id_here') {
      return res.status(400).json({
        error: 'GITHUB_CLIENT_ID is not configured. Add it to your .env file.'
      });
    }
    const data = await startDeviceFlow(clientId);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Auth start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/poll — poll for token completion
app.get('/api/auth/poll', async (req, res) => {
  try {
    const result = await pollDeviceFlow();
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/auth/logout — clear stored token
app.post('/api/auth/logout', (req, res) => {
  clearToken();
  res.json({ success: true });
});

// GET /api/auth/repos — list user's repositories from GitHub
app.get('/api/auth/repos', async (req, res) => {
  try {
    const repos = await getUserRepos();
    res.json({ success: true, repos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const SCAN_RESULTS_FILE = path.join(__dirname, 'scan-results.json');

// Keep track of active scan state
let activeScan = {
  running: false,
  logs: [],
  clients: []
};

// GET /api/scan/results — read current scan detections
app.get('/api/scan/results', (req, res) => {
  try {
    if (fs.existsSync(SCAN_RESULTS_FILE)) {
      res.json(readJson(SCAN_RESULTS_FILE));
    } else {
      res.json([]);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read scan results' });
  }
});

// POST /api/scan/run — trigger the repository scanner process
app.post('/api/scan/run', (req, res) => {
  if (activeScan.running) {
    return res.status(400).json({ error: 'A scan is already in progress.' });
  }

  const token = readStoredToken() || process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(400).json({ error: 'GitHub is not connected. Please connect first.' });
  }

  activeScan.running = true;
  activeScan.logs = [];

  console.log('\n🚀 Starting local repository scan...');
  const child = spawn('node', ['index.js'], {
    env: { ...process.env, GITHUB_TOKEN: token }
  });

  const appendLog = (data) => {
    const lines = data.toString().split(/\r?\n/).filter(line => line.trim() !== '');
    lines.forEach(line => {
      const formatted = `[${new Date().toLocaleTimeString()}] ${line}`;
      activeScan.logs.push(formatted);
      activeScan.clients.forEach(client => {
        client.write(`data: ${JSON.stringify({ log: formatted })}\n\n`);
      });
    });
  };

  child.stdout.on('data', appendLog);
  child.stderr.on('data', appendLog);

  child.on('close', (code) => {
    activeScan.running = false;
    const finalMsg = `[${new Date().toLocaleTimeString()}] Scan complete with code ${code}.`;
    activeScan.logs.push(finalMsg);
    activeScan.clients.forEach(client => {
      client.write(`data: ${JSON.stringify({ log: finalMsg, done: true })}\n\n`);
      client.end();
    });
    activeScan.clients = [];
  });

  res.json({ success: true, message: 'Scan started.' });
});

// GET /api/scan/stream — stream real-time logs via SSE
app.get('/api/scan/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send historical logs of this active scan if any
  activeScan.logs.forEach(log => {
    res.write(`data: ${JSON.stringify({ log })}\n\n`);
  });

  if (!activeScan.running) {
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } else {
    activeScan.clients.push(res);
    req.on('close', () => {
      activeScan.clients = activeScan.clients.filter(c => c !== res);
    });
  }
});

app.listen(PORT, () => {
  const token = readStoredToken();
  console.log(`\n🚀 Dashboard Server running at http://localhost:${PORT}`);
  if (token) {
    console.log('✅ GitHub token found — already authenticated.\n');
  } else {
    console.log('⚠  No GitHub token. Use the dashboard to log in.\n');
  }
});

