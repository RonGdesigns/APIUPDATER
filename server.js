import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { runResearch } from './research.js';
import { startDeviceFlow, pollDeviceFlow, getAuthStatus, clearToken, readStoredToken } from './auth.js';

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

app.listen(PORT, () => {
  const token = readStoredToken();
  console.log(`\n🚀 Dashboard Server running at http://localhost:${PORT}`);
  if (token) {
    console.log('✅ GitHub token found — already authenticated.\n');
  } else {
    console.log('⚠  No GitHub token. Use the dashboard to log in.\n');
  }
});

