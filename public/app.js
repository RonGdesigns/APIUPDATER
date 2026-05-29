const API_BASE = '/api';

// ---- DOM Elements ----
const saveScheduleBtn = document.getElementById('saveScheduleBtn');
const reposList       = document.getElementById('reposList');
const newRepoInput    = document.getElementById('newRepoInput');
const addRepoBtn      = document.getElementById('addRepoBtn');
const modelsGrid      = document.getElementById('modelsGrid');
const addModelBtn     = document.getElementById('addModelBtn');
const modelCountBadge = document.getElementById('modelCountBadge');
const statusPill      = document.getElementById('statusPill');
const toast           = document.getElementById('toast');
const runNowBtn       = document.getElementById('runNowBtn');
const researchBtn     = document.getElementById('researchBtn');
const cronDisplay     = document.getElementById('cronDisplay');

// Schedule controls
const freqTabs   = document.querySelectorAll('.freq-tab');
const dayBtns    = document.querySelectorAll('.day-btn');
const dayGroup   = document.getElementById('dayPickerGroup');
const pickHour   = document.getElementById('pickHour');
const pickMinute = document.getElementById('pickMinute');
const pickAmPm   = document.getElementById('pickAmPm');

// ---- State ----
let repos     = [];
let modelsMap = {};
let schedState = { freq: 'weekly', day: 0, hour24: 0, minute: 0 };

// ---- Toast ----
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ============================================================
// SCHEDULE — Visual Picker
// ============================================================

// Populate hour dropdown (1–12)
function buildHourDropdown() {
  for (let h = 1; h <= 12; h++) {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = h < 10 ? `0${h}` : `${h}`;
    pickHour.appendChild(opt);
  }
}

// Build cron string from UI state
function buildCron() {
  const { freq, day, hour24, minute } = schedState;
  const minStr = minute;
  if (freq === 'daily')   return `${minStr} ${hour24} * * *`;
  if (freq === 'monthly') return `${minStr} ${hour24} 1 * *`;
  return `${minStr} ${hour24} * * ${day}`; // weekly
}

// Convert 12h → 24h
function get24Hour() {
  let h = parseInt(pickHour.value);
  const ampm = pickAmPm.value;
  if (ampm === 'am' && h === 12) h = 0;
  if (ampm === 'pm' && h !== 12) h += 12;
  return h;
}

// Update preview display
function updateCronPreview() {
  schedState.hour24 = get24Hour();
  schedState.minute = parseInt(pickMinute.value);
  const cron = buildCron();
  cronDisplay.textContent = cron;
}

// Parse an incoming cron string into UI state
function parseCron(cron) {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return;
  const [min, hour, dom, , dow] = parts;

  schedState.minute = parseInt(min) || 0;
  schedState.hour24 = parseInt(hour) || 0;

  if (dom === '1' && dow === '*') {
    schedState.freq = 'monthly';
  } else if (dow !== '*') {
    schedState.freq = 'weekly';
    schedState.day  = parseInt(dow) || 0;
  } else {
    schedState.freq = 'daily';
  }

  // Sync UI
  syncFreqTabs();
  syncDayButtons();

  // Sync hour/ampm
  let h24 = schedState.hour24;
  const ampm = h24 >= 12 ? 'pm' : 'am';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  pickHour.value   = h12;
  pickAmPm.value   = ampm;
  pickMinute.value = schedState.minute;

  updateCronPreview();
}

function syncFreqTabs() {
  freqTabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.freq === schedState.freq);
  });
  dayGroup.classList.toggle('hidden', schedState.freq !== 'weekly');
}

function syncDayButtons() {
  dayBtns.forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.day) === schedState.day);
  });
}

// Frequency tab clicks
freqTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    schedState.freq = btn.dataset.freq;
    syncFreqTabs();
    updateCronPreview();
  });
});

// Day button clicks
dayBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    schedState.day = parseInt(btn.dataset.day);
    syncDayButtons();
    updateCronPreview();
  });
});

// Time select changes
[pickHour, pickMinute, pickAmPm].forEach(el => {
  el.addEventListener('change', updateCronPreview);
});

// Save schedule
saveScheduleBtn.addEventListener('click', async () => {
  const cron = buildCron();
  await fetch(`${API_BASE}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cron }),
  });
  showToast('✓ Schedule locked in.');
  saveScheduleBtn.textContent = 'Locked!';
  setTimeout(() => { saveScheduleBtn.textContent = 'Lock Schedule'; }, 2500);
});

async function fetchSchedule() {
  try {
    const res  = await fetch(`${API_BASE}/schedule`);
    const data = await res.json();
    parseCron(data.cron || '0 0 * * 0');
  } catch {
    parseCron('0 0 * * 0');
  }
}

// ============================================================
// REPOS
// ============================================================

async function fetchRepos() {
  try {
    const res = await fetch(`${API_BASE}/repos`);
    repos     = await res.json();
  } catch {
    repos = [];
  }
  renderRepos();
}

async function persistRepos() {
  try {
    await fetch(`${API_BASE}/repos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repos),
    });
  } catch (err) {
    showToast('⚠ Could not save: server not running?');
  }
}

function renderRepos() {
  reposList.innerHTML = '';
  if (!repos || repos.length === 0) {
    const li = document.createElement('li');
    li.style.cssText = 'color:rgba(183,199,163,0.4);font-size:0.75rem;padding:12px 0;';
    li.textContent = 'No repositories added yet.';
    reposList.appendChild(li);
    return;
  }
  repos.forEach((repo, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = repo;
    const btn = document.createElement('button');
    btn.className = 'btn-delete-repo';
    btn.textContent = 'Remove';
    btn.onclick = () => removeRepo(i);
    li.appendChild(span);
    li.appendChild(btn);
    reposList.appendChild(li);
  });
}

addRepoBtn.addEventListener('click', () => {
  const repo = newRepoInput.value.trim();
  if (!repo) {
    showToast('⚠ Please enter a repository (e.g. Owner/RepoName).');
    return;
  }
  if (repos.includes(repo)) {
    showToast('⚠ That repository is already in the list.');
    newRepoInput.value = '';
    return;
  }
  repos.push(repo);
  newRepoInput.value = '';
  persistRepos();
  renderRepos();
  showToast(`✓ ${repo} added to targets.`);
});

newRepoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addRepoBtn.click();
});

function removeRepo(index) {
  const removed = repos[index];
  repos.splice(index, 1);
  persistRepos();
  renderRepos();
  showToast(`✕ ${removed} removed.`);
}

// ============================================================
// MODELS
// ============================================================

async function fetchModels() {
  try {
    const res = await fetch(`${API_BASE}/models`);
    modelsMap = await res.json();
  } catch {
    modelsMap = {};
  }
  renderModels();
}

async function persistModels() {
  await fetch(`${API_BASE}/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(modelsMap),
  });
}

function renderModels() {
  modelsGrid.innerHTML = '';
  const entries = Object.entries(modelsMap);
  modelCountBadge.textContent = `${entries.length} Rule${entries.length !== 1 ? 's' : ''}`;

  if (entries.length === 0) {
    modelsGrid.innerHTML =
      '<p style="color:rgba(183,199,163,0.4);font-size:0.75rem;grid-column:span 2;padding:16px 0;">No rules yet. Hit "Research Models" to auto-populate.</p>';
    return;
  }

  entries.forEach(([oldModel, info]) => {
    const card      = document.createElement('div');
    card.className  = 'model-card';
    const isNA      = !info.deprecation_date || info.deprecation_date === 'N/A';
    const badgeClass = isNA ? 'dep-badge na' : 'dep-badge';
    const badgeText  = isNA ? 'No Fixed Date' : `Deprecated: ${info.deprecation_date}`;
    const safeModel  = oldModel.replace(/'/g, "\\'");

    card.innerHTML = `
      <button class="btn-remove" title="Remove rule" onclick="removeModel('${safeModel}')">×</button>
      <span class="${badgeClass}">${badgeText}</span>
      <div class="legacy-name">${oldModel}</div>
      <div class="arrow-label">↳ replaced by</div>
      <div class="replacement-name">${info.replacement}</div>
    `;
    modelsGrid.appendChild(card);
  });
}

addModelBtn.addEventListener('click', () => {
  const oldModel    = document.getElementById('oldModelInput').value.trim();
  const replacement = document.getElementById('newModelInput').value.trim();
  const depDate     = document.getElementById('depDateInput').value.trim() || 'N/A';
  if (!oldModel || !replacement) {
    showToast('⚠ Please fill in legacy model and replacement.');
    return;
  }
  modelsMap[oldModel] = { replacement, deprecation_date: depDate };
  document.getElementById('oldModelInput').value = '';
  document.getElementById('newModelInput').value = '';
  document.getElementById('depDateInput').value  = '';
  persistModels();
  renderModels();
  showToast(`✓ Rule injected for ${oldModel}.`);
});

window.removeModel = (oldModel) => {
  delete modelsMap[oldModel];
  persistModels();
  renderModels();
  showToast(`✕ Rule for ${oldModel} removed.`);
};

// ============================================================
// RESEARCH BUTTON
// ============================================================
researchBtn.addEventListener('click', async () => {
  if (researchBtn.classList.contains('loading')) return;
  researchBtn.classList.add('loading');
  researchBtn.querySelector('span:last-child').textContent = 'Researching...';
  showToast('🔬 Fetching latest deprecation data...');

  try {
    const res  = await fetch(`${API_BASE}/research`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      modelsMap = data.map;
      renderModels();
      showToast(`✓ Research complete! ${data.found} deprecated models found & mapped.`);
    } else {
      showToast('⚠ Research failed: ' + (data.error || 'Unknown error.'));
    }
  } catch (err) {
    showToast('⚠ Could not reach server. Is it running?');
  } finally {
    researchBtn.classList.remove('loading');
    researchBtn.querySelector('span:last-child').textContent = 'Research Models';
  }
});

// ============================================================
// RUN NOW
// ============================================================
runNowBtn.addEventListener('click', () => {
  statusPill.classList.add('active');
  statusPill.querySelector('span:last-child').textContent = 'Bot Running...';
  showToast('🚀 Scan triggered! Check GitHub Actions tab.');
  setTimeout(() => {
    statusPill.classList.remove('active');
    statusPill.querySelector('span:last-child').textContent = 'Bot Dormant';
  }, 5000);
});

// ============================================================
// AUTH — GitHub Device Flow
// ============================================================

const authModal      = document.getElementById('authModal');
const authModalClose = document.getElementById('authModalClose');
const githubLoginBtn = document.getElementById('githubLoginBtn');
const logoutBtn      = document.getElementById('logoutBtn');
const authUnconnected = document.getElementById('authUnconnected');
const authConnected  = document.getElementById('authConnected');
const authAvatar     = document.getElementById('authAvatar');
const authUsername   = document.getElementById('authUsername');
const authUserCode   = document.getElementById('authUserCode');
const authVerifyLink = document.getElementById('authVerifyLink');
const authExpireNote = document.getElementById('authExpireNote');
const pollStatusText = document.getElementById('pollStatusText');
const copyCodeBtn    = document.getElementById('copyCodeBtn');
const authStepCode   = document.getElementById('authStepCode');
const authStepSuccess = document.getElementById('authStepSuccess');
const authSuccessMsg = document.getElementById('authSuccessMsg');
const authDoneBtn    = document.getElementById('authDoneBtn');

let pollInterval = null;

function showAuthModal() {
  authModal.classList.remove('hidden');
  // Reset to step 1
  authStepCode.classList.remove('hidden');
  authStepSuccess.classList.add('hidden');
}

function hideAuthModal() {
  authModal.classList.add('hidden');
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

function setConnected(user) {
  authUnconnected.classList.add('hidden');
  authConnected.classList.remove('hidden');
  if (user) {
    authAvatar.src    = user.avatar_url || '';
    authUsername.textContent = '@' + (user.login || 'Connected');
  }
}

function setDisconnected() {
  authUnconnected.classList.remove('hidden');
  authConnected.classList.add('hidden');
}

// Check auth status on page load
async function checkAuthStatus() {
  try {
    const res  = await fetch(`${API_BASE}/auth/status`);
    const data = await res.json();
    if (data.authenticated) {
      setConnected(data.user);
    } else {
      setDisconnected();
    }
  } catch {
    setDisconnected();
  }
}

// Start device flow
githubLoginBtn.addEventListener('click', async () => {
  showAuthModal();
  authUserCode.textContent = '— — — —';
  pollStatusText.textContent = 'Requesting authorization code...';

  try {
    const res  = await fetch(`${API_BASE}/auth/start`, { method: 'POST' });
    const data = await res.json();

    if (!data.success) {
      pollStatusText.textContent = '⚠ ' + (data.error || 'Failed to start auth.');
      return;
    }

    // Display the code
    authUserCode.textContent = data.user_code;
    authVerifyLink.href      = data.verification_uri;
    authExpireNote.textContent = `Code expires in ${Math.floor(data.expires_in / 60)} minutes.`;
    pollStatusText.textContent = 'Waiting for you to enter the code...';

    // Start polling
    const pollMs = (data.interval || 5) * 1000;
    pollInterval = setInterval(async () => {
      try {
        const pollRes  = await fetch(`${API_BASE}/auth/poll`);
        const pollData = await pollRes.json();

        if (pollData.status === 'authorized') {
          clearInterval(pollInterval); pollInterval = null;
          // Show success step
          authStepCode.classList.add('hidden');
          authStepSuccess.classList.remove('hidden');
          authSuccessMsg.textContent = `Authorized as @${pollData.user?.login || 'GitHub User'}.`;
          setConnected(pollData.user);
          showToast('✓ GitHub connected successfully!');
        } else if (pollData.status === 'expired') {
          clearInterval(pollInterval); pollInterval = null;
          pollStatusText.textContent = '⚠ Code expired. Close and try again.';
        } else if (pollData.status === 'error') {
          clearInterval(pollInterval); pollInterval = null;
          pollStatusText.textContent = '⚠ ' + (pollData.message || 'Auth error.');
        }
        // 'pending' → keep polling silently
      } catch { /* network blip, keep trying */ }
    }, pollMs);

  } catch (err) {
    pollStatusText.textContent = '⚠ Could not reach server.';
  }
});

// Copy code button
copyCodeBtn.addEventListener('click', () => {
  const code = authUserCode.textContent.trim();
  navigator.clipboard.writeText(code).then(() => {
    copyCodeBtn.textContent = 'Copied!';
    setTimeout(() => { copyCodeBtn.textContent = 'Copy'; }, 2000);
    // Jump to the GitHub device authorization page
    const targetUrl = authVerifyLink.href || 'https://github.com/login/device';
    window.open(targetUrl, '_blank');
  });
});

// Close modal
authModalClose.addEventListener('click', hideAuthModal);
authModal.addEventListener('click', (e) => {
  if (e.target === authModal) hideAuthModal();
});

// Done button after success
authDoneBtn.addEventListener('click', hideAuthModal);

// Logout
logoutBtn.addEventListener('click', async () => {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  setDisconnected();
  showToast('✓ Disconnected from GitHub.');
});

// ============================================================
// BOOT
// ============================================================
buildHourDropdown();
Promise.all([fetchSchedule(), fetchRepos(), fetchModels(), checkAuthStatus()]);

