const state = {
  currentScreen: 'home',
  previousScreen: null,
  currentSport: null,
  pendingDefaultSport: null,
  footballInterval: null,
  cricketInterval: null,
  alwaysOn: localStorage.getItem('alwaysOn') === 'true',
  defaultSport: localStorage.getItem('defaultSport') || null,
};

// ── Screen management ──────────────────────────────────────────
function showScreen(id, from) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  const screen = document.getElementById('screen-' + id);
  screen.classList.add('active');
  state.previousScreen = from ?? state.currentScreen;
  state.currentScreen = id;
  const first = screen.querySelector('.focusable');
  if (first) first.focus();
}

function goBack() {
  const dialog = document.getElementById('dialog-default');
  if (!dialog.classList.contains('hidden')) {
    dialog.classList.add('hidden');
    return;
  }
  if (state.currentScreen === 'settings') {
    showScreen(state.previousScreen);
  } else if (state.currentScreen === 'match-detail') {
    showScreen(state.currentSport);
  } else {
    showScreen('home');
  }
}

// ── Sport selection ────────────────────────────────────────────
function selectSport(sport) {
  state.currentSport = sport;

  if (sport === 'football') {
    showScreen('football');
    loadFootball();
    clearInterval(state.footballInterval);
    state.footballInterval = setInterval(loadFootball, 60_000);
  } else {
    showScreen('cricket');
    loadCricket();
    clearInterval(state.cricketInterval);
    // 15-minute refresh to respect the free-tier daily limit
    state.cricketInterval = setInterval(loadCricket, 900_000);
  }

  if (!state.defaultSport) {
    state.pendingDefaultSport = sport;
    setTimeout(() => {
      const dialog = document.getElementById('dialog-default');
      dialog.classList.remove('hidden');
      document.getElementById('btn-set-default').focus();
    }, 1200);
  }
}

// ── Football ───────────────────────────────────────────────────
async function loadFootball() {
  const el = document.getElementById('football-content');
  el.innerHTML = '<div class="loading">LOADING…</div>';
  try {
    const res = await fetch('/api/football');
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    renderFootball(data.matches || []);
  } catch {
    el.innerHTML = noMatchesHTML('⚽', 'Could not load', 'Check your connection and try again.');
  }
}

function renderFootball(matches) {
  const el = document.getElementById('football-content');
  if (!matches.length) {
    el.innerHTML = noMatchesHTML('⚽', 'No Live Matches', 'No World Cup or La Liga matches are live right now.');
    return;
  }

  const list = document.createElement('div');
  list.className = 'match-list';

  matches.forEach(match => {
    const home = match.homeTeam;
    const away = match.awayTeam;
    const s = match.score;
    const hg = s?.fullTime?.home ?? s?.halfTime?.home ?? '–';
    const ag = s?.fullTime?.away ?? s?.halfTime?.away ?? '–';
    const min = match.minute ? match.minute + "'" : '';
    const status = statusLabel(match.status);
    const comp = [match.competition?.name, match.matchday ? 'MD ' + match.matchday : ''].filter(Boolean).join(' · ');

    const card = document.createElement('div');
    card.className = 'match-card focusable';
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="match-competition">${comp}</div>
      <div class="match-teams">
        <div class="team-block">
          ${home.crest ? `<img class="team-crest" src="${home.crest}" alt="" onerror="this.style.display='none'">` : ''}
          <div class="team-name">${home.shortName || home.name}</div>
        </div>
        <div class="score-block">
          <div class="score-text">${hg} : ${ag}</div>
          <div class="match-minute">${min}</div>
          <div class="match-status-badge ${statusClass(match.status)}">${status}</div>
        </div>
        <div class="team-block">
          ${away.crest ? `<img class="team-crest" src="${away.crest}" alt="" onerror="this.style.display='none'">` : ''}
          <div class="team-name">${away.shortName || away.name}</div>
        </div>
      </div>`;

    card.addEventListener('click', () => openFootballDetail(match));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFootballDetail(match); }
    });
    list.appendChild(card);
  });

  el.innerHTML = '';
  el.appendChild(list);
}

function openFootballDetail(match) {
  const home = match.homeTeam;
  const away = match.awayTeam;
  const s = match.score;
  const hg = s?.fullTime?.home ?? s?.halfTime?.home ?? '–';
  const ag = s?.fullTime?.away ?? s?.halfTime?.away ?? '–';
  const min = match.minute ? match.minute + "'" : '';

  document.getElementById('detail-competition-header').textContent = match.competition?.name || 'Football';
  document.getElementById('match-detail-content').innerHTML = `
    <div class="detail-card">
      <div class="detail-stage">${match.stage || ''} ${match.matchday ? '· Matchday ' + match.matchday : ''}</div>
      <div class="detail-teams">
        <div class="detail-team">
          ${home.crest ? `<img class="detail-crest" src="${home.crest}" alt="" onerror="this.style.display='none'">` : ''}
          <div class="detail-name">${home.shortName || home.name}</div>
        </div>
        <div class="detail-score-center">
          <div class="detail-score-text">${hg} : ${ag}</div>
          <div class="detail-time">${min}</div>
          <div class="detail-status">${statusLabel(match.status)}</div>
        </div>
        <div class="detail-team">
          ${away.crest ? `<img class="detail-crest" src="${away.crest}" alt="" onerror="this.style.display='none'">` : ''}
          <div class="detail-name">${away.shortName || away.name}</div>
        </div>
      </div>
    </div>`;

  showScreen('match-detail', 'football');
}

// ── Cricket ────────────────────────────────────────────────────
async function loadCricket() {
  const el = document.getElementById('cricket-content');
  el.innerHTML = '<div class="loading">LOADING…</div>';
  try {
    const res = await fetch('/api/cricket');
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    renderCricket(data.data || []);
  } catch {
    el.innerHTML = noMatchesHTML('🏏', 'Could not load', 'Check your connection and try again.');
  }
}

function renderCricket(matches) {
  const el = document.getElementById('cricket-content');
  const live = matches.filter(m => !m.matchEnded);

  if (!live.length) {
    el.innerHTML = noMatchesHTML('🏏', 'No Live Matches', 'No cricket matches are live right now.');
    return;
  }

  const list = document.createElement('div');
  list.className = 'match-list';

  live.forEach(match => {
    const card = document.createElement('div');
    card.className = 'match-card focusable';
    card.tabIndex = 0;

    // cricketdata.org uses match.name ("India vs Australia, 1st T20I")
    // and score[].inning for the innings label
    const matchTitle = match.name || (match.teams || []).join(' vs ');
    const matchType = (match.matchType || 'CRICKET').toUpperCase();

    const lines = (match.score || []).map(s => {
      const label = s.inning || '';
      return `<div class="cricket-score-line">${label}: ${s.r}/${s.w} (${s.o} ov)</div>`;
    }).join('');

    card.innerHTML = `
      <div class="match-competition">${matchType}</div>
      <div class="match-competition" style="margin-top:-8px;margin-bottom:10px;font-size:12px;color:#E4E6EB">${matchTitle}</div>
      <div class="cricket-scores">
        ${lines || '<div class="cricket-score-line" style="color:#B0B3B8">Innings yet to begin</div>'}
        <div class="match-status-badge">LIVE</div>
      </div>`;

    card.addEventListener('click', () => openCricketDetail(match));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCricketDetail(match); }
    });
    list.appendChild(card);
  });

  el.innerHTML = '';
  el.appendChild(list);
}

function openCricketDetail(match) {
  const matchTitle = match.name || (match.teams || []).join(' vs ');
  document.getElementById('detail-competition-header').textContent = (match.matchType || 'Cricket').toUpperCase();

  const scoreRows = (match.score || []).map(s => `
    <div class="cricket-team-score">
      <div class="cricket-team-name">${s.inning || ''}</div>
      <div class="cricket-runs">${s.r}/${s.w}</div>
      <div class="cricket-overs">${s.o} overs</div>
    </div>`).join('');

  document.getElementById('match-detail-content').innerHTML = `
    <div class="detail-card">
      <div class="detail-stage">${matchTitle}</div>
      <div class="cricket-detail-scores">${scoreRows || '<div style="color:#B0B3B8;text-align:center;flex:1;display:flex;align-items:center;justify-content:center">Innings yet to begin</div>'}</div>
      <div class="detail-status">LIVE</div>
    </div>`;

  showScreen('match-detail', 'cricket');
}

// ── Helpers ────────────────────────────────────────────────────
function statusLabel(status) {
  return { IN_PLAY: 'LIVE', PAUSED: 'HALF TIME', EXTRA_TIME: 'EXTRA TIME', PENALTY_SHOOTOUT: 'PENALTIES', FINISHED: 'FT' }[status] || status || '';
}

function statusClass(status) {
  if (status === 'FINISHED') return 'ft';
  if (status === 'PAUSED') return 'ht';
  return '';
}

function noMatchesHTML(icon, title, sub) {
  return `<div class="no-matches">
    <div class="no-matches-icon">${icon}</div>
    <div class="no-matches-title">${title}</div>
    <div class="no-matches-sub">${sub}</div>
  </div>`;
}

// ── Settings ───────────────────────────────────────────────────
function syncSettings() {
  const toggle = document.getElementById('toggle-always-on');
  toggle.textContent = state.alwaysOn ? 'ON' : 'OFF';
  toggle.className = 'setting-toggle' + (state.alwaysOn ? ' on' : '');
  document.getElementById('value-default-sport').textContent =
    state.defaultSport ? state.defaultSport.charAt(0).toUpperCase() + state.defaultSport.slice(1) : 'None';
}

// ── D-pad keyboard navigation ──────────────────────────────────
document.addEventListener('keydown', e => {
  const dialogOpen = !document.getElementById('dialog-default').classList.contains('hidden');
  const scope = dialogOpen
    ? '#dialog-default'
    : '#screen-' + state.currentScreen;
  const focusables = Array.from(document.querySelectorAll(scope + ' .focusable'));
  const idx = focusables.indexOf(document.activeElement);

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (idx < focusables.length - 1) focusables[idx + 1].focus();
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (idx > 0) focusables[idx - 1].focus();
      break;
    case 'ArrowLeft':
    case 'Escape':
      goBack();
      break;
    case 'ArrowRight':
    case 'Enter':
    case ' ':
      if (document.activeElement && document.activeElement !== document.body) {
        e.preventDefault();
        document.activeElement.click();
      }
      break;
  }
});

// ── Wire up buttons ────────────────────────────────────────────
document.getElementById('btn-football').addEventListener('click', () => selectSport('football'));
document.getElementById('btn-cricket').addEventListener('click', () => selectSport('cricket'));

document.getElementById('btn-back-football').addEventListener('click', goBack);
document.getElementById('btn-back-cricket').addEventListener('click', goBack);
document.getElementById('btn-back-detail').addEventListener('click', goBack);
document.getElementById('btn-back-settings').addEventListener('click', goBack);

document.getElementById('btn-settings-home').addEventListener('click', () => showScreen('settings', 'home'));
document.getElementById('btn-settings-football').addEventListener('click', () => showScreen('settings', 'football'));
document.getElementById('btn-settings-cricket').addEventListener('click', () => showScreen('settings', 'cricket'));

document.getElementById('setting-always-on').addEventListener('click', () => {
  state.alwaysOn = !state.alwaysOn;
  localStorage.setItem('alwaysOn', state.alwaysOn);
  syncSettings();
});

document.getElementById('setting-clear-default').addEventListener('click', () => {
  state.defaultSport = null;
  localStorage.removeItem('defaultSport');
  syncSettings();
});

document.getElementById('btn-set-default').addEventListener('click', () => {
  state.defaultSport = state.pendingDefaultSport;
  localStorage.setItem('defaultSport', state.defaultSport);
  document.getElementById('dialog-default').classList.add('hidden');
  syncSettings();
});

document.getElementById('btn-skip-default').addEventListener('click', () => {
  document.getElementById('dialog-default').classList.add('hidden');
});

// ── Boot ───────────────────────────────────────────────────────
syncSettings();
if (state.defaultSport) {
  selectSport(state.defaultSport);
} else {
  showScreen('home');
}
