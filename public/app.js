const API_BASE = '/api';

// ---- DOM Elements ----
const cronInput        = document.getElementById('cronInput');
const saveScheduleBtn  = document.getElementById('saveScheduleBtn');
const reposList        = document.getElementById('reposList');
const newRepoInput     = document.getElementById('newRepoInput');
const addRepoBtn       = document.getElementById('addRepoBtn');
const modelsGrid       = document.getElementById('modelsGrid');
const addModelBtn      = document.getElementById('addModelBtn');
const modelCountBadge  = document.getElementById('modelCountBadge');
const statusPill       = document.getElementById('statusPill');
const toast            = document.getElementById('toast');
const runNowBtn        = document.getElementById('runNowBtn');

// ---- State ----
let repos     = [];
let modelsMap = {};

// ---- Toast Notification ----
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---- Init ----
async function init() {
  await Promise.all([fetchSchedule(), fetchRepos(), fetchModels()]);
}

// ---- Schedule ----
async function fetchSchedule() {
  const res  = await fetch(`${API_BASE}/schedule`);
  const data = await res.json();
  cronInput.value = data.cron || '0 0 * * 0';
  syncPresets(data.cron);
}

function syncPresets(cron) {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cron === cron);
  });
}

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    cronInput.value = btn.dataset.cron;
    syncPresets(btn.dataset.cron);
  });
});

saveScheduleBtn.addEventListener('click', async () => {
  const cron = cronInput.value.trim();
  if (!cron) return;
  await fetch(`${API_BASE}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cron })
  });
  syncPresets(cron);
  showToast('✓ Schedule locked in.');
  saveScheduleBtn.textContent = 'Locked!';
  setTimeout(() => saveScheduleBtn.textContent = 'Lock Schedule', 2500);
});

// ---- Repos ----
async function fetchRepos() {
  const res = await fetch(`${API_BASE}/repos`);
  repos     = await res.json();
  renderRepos();
}

async function persistRepos() {
  await fetch(`${API_BASE}/repos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(repos)
  });
}

function renderRepos() {
  reposList.innerHTML = '';
  if (repos.length === 0) {
    reposList.innerHTML = '<li style="color: rgba(183,199,163,0.4); font-size: 0.75rem; padding: 12px 0;">No repositories added yet.</li>';
    return;
  }
  repos.forEach((repo, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${repo}</span>
      <button class="btn-delete-repo" onclick="removeRepo(${i})">Remove</button>
    `;
    reposList.appendChild(li);
  });
}

addRepoBtn.addEventListener('click', () => {
  const repo = newRepoInput.value.trim();
  if (!repo || repos.includes(repo)) return;
  repos.push(repo);
  newRepoInput.value = '';
  persistRepos();
  renderRepos();
  showToast(`✓ ${repo} added to targets.`);
});

newRepoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addRepoBtn.click();
});

window.removeRepo = (index) => {
  const removed = repos[index];
  repos.splice(index, 1);
  persistRepos();
  renderRepos();
  showToast(`✕ ${removed} removed.`);
};

// ---- Models ----
async function fetchModels() {
  const res = await fetch(`${API_BASE}/models`);
  modelsMap = await res.json();
  renderModels();
}

async function persistModels() {
  await fetch(`${API_BASE}/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(modelsMap)
  });
}

function renderModels() {
  modelsGrid.innerHTML = '';
  const entries = Object.entries(modelsMap);
  modelCountBadge.textContent = `${entries.length} Rule${entries.length !== 1 ? 's' : ''}`;

  if (entries.length === 0) {
    modelsGrid.innerHTML = '<p style="color: rgba(183,199,163,0.4); font-size: 0.75rem; grid-column: span 2;">No rules in the deprecation map.</p>';
    return;
  }

  entries.forEach(([oldModel, info]) => {
    const card = document.createElement('div');
    card.className = 'model-card';

    const isNA = !info.deprecation_date || info.deprecation_date === 'N/A';
    const badgeClass = isNA ? 'dep-badge na' : 'dep-badge';
    const badgeText  = isNA ? 'No Fixed Date' : `Deprecated: ${info.deprecation_date}`;

    card.innerHTML = `
      <button class="btn-remove" title="Remove rule" onclick="removeModel('${oldModel.replace(/'/g, "\\'")}')">×</button>
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

// ---- Run Now ----
runNowBtn.addEventListener('click', () => {
  statusPill.classList.add('active');
  statusPill.querySelector('span:last-child').textContent = 'Bot Running...';
  showToast('🚀 Scan triggered! Check GitHub Actions.');
  setTimeout(() => {
    statusPill.classList.remove('active');
    statusPill.querySelector('span:last-child').textContent = 'Bot Dormant';
  }, 5000);
});

// ---- Boot ----
init();
