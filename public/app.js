const API_BASE = '/api';

// Elements
const cronInput = document.getElementById('cronInput');
const saveScheduleBtn = document.getElementById('saveScheduleBtn');
const reposList = document.getElementById('reposList');
const newRepoInput = document.getElementById('newRepoInput');
const addRepoBtn = document.getElementById('addRepoBtn');
const modelsGrid = document.getElementById('modelsGrid');
const addModelBtn = document.getElementById('addModelBtn');

// State
let repos = [];
let modelsMap = {};

// Initialization
async function init() {
  await fetchSchedule();
  await fetchRepos();
  await fetchModels();
}

// API Calls
async function fetchSchedule() {
  const res = await fetch(`${API_BASE}/schedule`);
  const data = await res.json();
  cronInput.value = data.cron;
}

async function saveSchedule() {
  const cron = cronInput.value;
  await fetch(`${API_BASE}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cron })
  });
  saveScheduleBtn.textContent = 'SAVED';
  setTimeout(() => saveScheduleBtn.textContent = 'Lock Schedule', 2000);
}

async function fetchRepos() {
  const res = await fetch(`${API_BASE}/repos`);
  repos = await res.json();
  renderRepos();
}

async function saveRepos() {
  await fetch(`${API_BASE}/repos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(repos)
  });
  renderRepos();
}

async function fetchModels() {
  const res = await fetch(`${API_BASE}/models`);
  modelsMap = await res.json();
  renderModels();
}

async function saveModels() {
  await fetch(`${API_BASE}/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(modelsMap)
  });
  renderModels();
}

// Render Logic
function renderRepos() {
  reposList.innerHTML = '';
  repos.forEach((repo, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${repo}</span>
      <button class="btn-delete" onclick="removeRepo(${index})">KILL</button>
    `;
    reposList.appendChild(li);
  });
}

function renderModels() {
  modelsGrid.innerHTML = '';
  for (const [oldModel, info] of Object.entries(modelsMap)) {
    const card = document.createElement('div');
    card.className = 'model-card';
    card.innerHTML = `
      <span class="badge">${info.deprecation_date}</span>
      <h4>${oldModel}</h4>
      <div class="replacement">→ ${info.replacement}</div>
      <button class="btn-delete" style="margin-top: 12px; width: 100%;" onclick="removeModel('${oldModel}')">REMOVE RULE</button>
    `;
    modelsGrid.appendChild(card);
  }
}

// Event Handlers
saveScheduleBtn.addEventListener('click', saveSchedule);

addRepoBtn.addEventListener('click', () => {
  const repo = newRepoInput.value.trim();
  if (repo && !repos.includes(repo)) {
    repos.push(repo);
    newRepoInput.value = '';
    saveRepos();
  }
});

window.removeRepo = (index) => {
  repos.splice(index, 1);
  saveRepos();
};

addModelBtn.addEventListener('click', () => {
  const oldModel = document.getElementById('oldModelInput').value.trim();
  const replacement = document.getElementById('newModelInput').value.trim();
  const depDate = document.getElementById('depDateInput').value.trim() || 'N/A';

  if (oldModel && replacement) {
    modelsMap[oldModel] = { replacement, deprecation_date: depDate };
    document.getElementById('oldModelInput').value = '';
    document.getElementById('newModelInput').value = '';
    document.getElementById('depDateInput').value = '';
    saveModels();
  }
});

window.removeModel = (oldModel) => {
  delete modelsMap[oldModel];
  saveModels();
};

document.getElementById('runNowBtn').addEventListener('click', () => {
  alert('In a full environment, this would spawn the bot process manually.');
});

// Boot
init();
