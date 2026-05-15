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

// ── Screens ────────────────────────────────────────────────────
function showScreen(id, from) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  state.previousScreen = from ?? state.currentScreen;
  state.currentScreen = id;
  const first = document.querySelector('#screen-' + id + ' .focusable');
  if (first) first.focus();
}

function goBack() {
  const dialog = document.getElementById('dialog-default');
  if (!dialog.classList.contains('hidden')) { dialog.classList.add('hidden'); return; }
  if (state.currentScreen === 'settings') showScreen(state.previousScreen);
  else if (state.currentScreen === 'match-detail') showScreen(state.currentSport);
  else showScreen('home');
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
    state.cricketInterval = setInterval(loadCricket, 900_000);
  }
  if (!state.defaultSport) {
    state.pendingDefaultSport = sport;
    setTimeout(() => {
      document.getElementById('dialog-default').classList.remove('hidden');
      document.getElementById('btn-set-default').focus();
    }, 1200);
  }
}

// ── Match card builder (shared by list + single + detail) ──────
function buildMatchCard(match, scoreClass, crestClass) {
  const home = match.homeTeam;
  const away = match.awayTeam;
  const s = match.score;
  const hg = s?.fullTime?.home ?? s?.halfTime?.home ?? '–';
  const ag = s?.fullTime?.away ?? s?.halfTime?.away ?? '–';
  const min = match.minute ? match.minute + "'" : '';
  const comp = match.competition?.name || '';

  return `
    <div class="live-bar">
      <span class="live-dot"></span>
      <span class="live-text">LIVE · ${comp}</span>
    </div>
    <div class="card-teams">
      <div class="card-team">
        ${home.crest ? `<img class="${crestClass}" src="${home.crest}" alt="" onerror="this.style.display='none'">` : ''}
        <div class="card-team-name">${home.shortName || home.name}</div>
      </div>
      <div class="card-center">
        <div class="${scoreClass}">${hg}:${ag}</div>
        <div class="card-time">${min}</div>
      </div>
      <div class="card-team">
        ${away.crest ? `<img class="${crestClass}" src="${away.crest}" alt="" onerror="this.style.display='none'">` : ''}
        <div class="card-team-name">${away.shortName || away.name}</div>
      </div>
    </div>`;
}

// ── Football ───────────────────────────────────────────────────
async function loadFootball() {
  const el = document.getElementById('football-content');
  el.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const res = await fetch('/api/football');
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    renderFootball(data.matches || [], data.nextMatch || null);
  } catch {
    el.innerHTML = '<div class="no-matches"><div class="no-matches-icon">⚽</div><div class="no-matches-title">Could not load</div><div class="no-matches-sub">Check your connection.</div></div>';
  }
}

// ── DEMO: remove this block when real matches are live ──────────
const DUMMY_MATCHES = [
  {
    competition: { name: 'La Liga' },
    matchday: 36,
    stage: 'REGULAR_SEASON',
    status: 'IN_PLAY',
    minute: 87,
    homeTeam: { id: 81, name: 'FC Barcelona', shortName: 'Barcelona', crest: 'https://crests.football-data.org/81.svg' },
    awayTeam: { id: 86, name: 'Real Madrid CF', shortName: 'Real Madrid', crest: 'https://crests.football-data.org/86.svg' },
    score: { fullTime: { home: 3, away: 2 }, halfTime: { home: 1, away: 1 } },
    goals: [
      { minute: 7,  injuryTime: null, team: { id: 81 }, scorer: { name: 'Lionel Messi' } },
      { minute: 10, injuryTime: 57,   team: { id: 81 }, scorer: { name: 'Andrés Iniesta' } },
      { minute: 38, injuryTime: null, team: { id: 81 }, scorer: { name: 'R. Lewandowski' } },
      { minute: 14, injuryTime: null, team: { id: 86 }, scorer: { name: 'Cristiano Ronaldo' } },
      { minute: 11, injuryTime: null, team: { id: 86 }, scorer: { name: 'Sergio Ramos' } },
    ],
  },
  {
    competition: { name: 'La Liga' },
    matchday: 36,
    stage: 'REGULAR_SEASON',
    status: 'PAUSED',
    minute: 45,
    homeTeam: { id: 78, name: 'Atletico Madrid', shortName: 'Atlético', crest: 'https://crests.football-data.org/78.svg' },
    awayTeam: { id: 559, name: 'Sevilla FC', shortName: 'Sevilla', crest: 'https://crests.football-data.org/559.svg' },
    score: { fullTime: { home: null, away: null }, halfTime: { home: 1, away: 0 } },
    goals: [
      { minute: 33, injuryTime: null, team: { id: 78 }, scorer: { name: 'A. Griezmann' } },
    ],
  },
];
// ── END DEMO ────────────────────────────────────────────────────

function renderFootball(matches, nextMatch) {
  const el = document.getElementById('football-content');

  // Use dummy data when no live matches (remove DUMMY_MATCHES line below when going live)
  if (!matches.length) matches = DUMMY_MATCHES;

  if (!matches.length) {
    const nextInfo = nextMatch ? formatNextMatch(nextMatch) : null;
    el.innerHTML = `
      <div class="no-matches">
        <div class="no-matches-icon">⚽</div>
        <div class="no-matches-title">No Live Matches</div>
        <div class="no-matches-sub">World Cup · La Liga · Champions League · Premier League</div>
        ${nextInfo ? `<div class="next-match-pill">${nextInfo}</div>` : ''}
      </div>`;
    return;
  }

  // ONE GAME — card anchored to bottom, big score
  if (matches.length === 1) {
    const match = matches[0];
    const card = document.createElement('div');
    card.className = 'match-card focusable';
    card.tabIndex = 0;
    card.innerHTML = `<div class="inner">${buildMatchCard(match, 'score-full', 'crest-lg')}</div>`;

    const wrap = document.createElement('div');
    wrap.className = 'single-match-wrap';
    wrap.appendChild(card);

    el.innerHTML = '';
    el.appendChild(wrap);

    card.addEventListener('click', () => openFootballDetail(match));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFootballDetail(match); } });
    card.focus();
    return;
  }

  // MULTIPLE GAMES — scrollable list
  const list = document.createElement('div');
  list.className = 'match-list';

  matches.forEach(match => {
    const card = document.createElement('div');
    card.className = 'match-card focusable';
    card.tabIndex = 0;
    card.innerHTML = `<div class="inner">${buildMatchCard(match, 'score-list', 'crest-md')}</div>`;
    card.addEventListener('click', () => openFootballDetail(match));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFootballDetail(match); } });
    list.appendChild(card);
  });

  el.innerHTML = '';
  el.appendChild(list);
}

// ── Football detail — unified card with goalscorers inside ─────
function openFootballDetail(match) {
  const home = match.homeTeam;
  const away = match.awayTeam;
  const goals = match.goals || [];
  const homeGoals = goals.filter(g => g.team?.id === home.id);
  const awayGoals = goals.filter(g => g.team?.id === away.id);

  const scorerHTML = (goalList) => goalList.map(g => {
    const name = g.scorer?.name || '';
    const min = g.minute ? g.minute + "'" + (g.injuryTime ? ' +' + g.injuryTime : '') : '';
    return `<div class="scorer-name">${name}<span class="minute"> ${min}</span></div>`;
  }).join('');

  const hasGoals = goals.length > 0;

  document.getElementById('detail-competition-header').textContent = match.competition?.name || 'Football';
  document.getElementById('match-detail-content').innerHTML = `
    <div class="detail-wrap">
      <div class="detail-unified-card">
        <div class="inner">
          ${buildMatchCard(match, 'score-detail', 'crest-lg')}
          ${hasGoals ? `
          <div class="detail-divider"></div>
          <div class="detail-scorers">
            <div class="scorer-col">${scorerHTML(homeGoals)}</div>
            <div class="scorer-col right">${scorerHTML(awayGoals)}</div>
          </div>` : ''}
        </div>
      </div>
    </div>`;

  showScreen('match-detail', 'football');
}

// ── Cricket ────────────────────────────────────────────────────
async function loadCricket() {
  const el = document.getElementById('cricket-content');
  el.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const res = await fetch('/api/cricket');
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    renderCricket(data.data || []);
  } catch {
    el.innerHTML = '<div class="no-matches"><div class="no-matches-icon">🏏</div><div class="no-matches-title">Could not load</div><div class="no-matches-sub">Check your connection.</div></div>';
  }
}

function isIPLorInternational(m) {
  const type = (m.matchType || '').toLowerCase();
  const teams = m.teams || [];
  const t1 = (teams[0] || '').toLowerCase();
  const t2 = (teams[1] || '').toLowerCase();
  const name = (m.name || '').toLowerCase();

  // Exclude women's, U19, A-team, and emerging matches
  const isSecondary = [t1, t2, name].some(s =>
    s.includes('women') || s.includes(' a ') || s.endsWith(' a') ||
    s.includes('u19') || s.includes('under-19') || s.includes('emerging')
  );
  if (isSecondary) return false;

  // IPL: either team is a known IPL franchise
  const isIPL = !!(IPL_TEAMS[t1] || IPL_TEAMS[t2]);

  // International: at least one team must be a national team
  const hasNationalTeam = !!(COUNTRY_FLAGS[t1] || COUNTRY_FLAGS[t2]);
  const isOdiOrTest = (type === 'odi' || type === 'test') && hasNationalTeam;
  const isIntlT20 = (type === 't20i' || type === 't20') && hasNationalTeam;

  console.log('[cricket]', teams, '|', type, '→ ipl:', isIPL, 'national:', hasNationalTeam);
  return isIPL || isOdiOrTest || isIntlT20;
}

// ── DEMO: remove when real cricket matches are live ────────────
const DUMMY_CRICKET_MATCHES = [
  {
    name: 'Mumbai Indians vs Chennai Super Kings, 52nd Match',
    matchType: 't20',
    matchStarted: true,
    matchEnded: false,
    teams: ['Mumbai Indians', 'Chennai Super Kings'],
    score: [
      { inning: 'Mumbai Indians Inning 1', r: 186, w: 5, o: 20 },
      { inning: 'Chennai Super Kings Inning 1', r: 142, w: 7, o: 17.3 },
    ],
  },
  {
    name: 'India vs Australia, 3rd T20I',
    matchType: 't20i',
    matchStarted: true,
    matchEnded: false,
    teams: ['India', 'Australia'],
    score: [
      { inning: 'India Inning 1', r: 204, w: 4, o: 20 },
      { inning: 'Australia Inning 1', r: 97, w: 3, o: 11.2 },
    ],
  },
];
// ── END DEMO ───────────────────────────────────────────────────

function renderCricket(matches) {
  const el = document.getElementById('cricket-content');
  let live = matches.filter(m => !m.matchEnded && isIPLorInternational(m));

  // Use dummy data when no live matches (remove DUMMY_CRICKET_MATCHES line below when going live)
  if (!live.length) live = DUMMY_CRICKET_MATCHES;

  if (!live.length) {
    el.innerHTML = '<div class="no-matches"><div class="no-matches-icon">🏏</div><div class="no-matches-title">No Live Matches</div><div class="no-matches-sub">IPL · International</div></div>';
    return;
  }

  // ONE GAME
  if (live.length === 1) {
    const match = live[0];
    const card = buildCricketCard(match, true);
    const wrap = document.createElement('div');
    wrap.className = 'single-match-wrap';
    wrap.appendChild(card);
    el.innerHTML = '';
    el.appendChild(wrap);
    card.focus();
    return;
  }

  // MULTIPLE
  const list = document.createElement('div');
  list.className = 'match-list';
  live.forEach(match => list.appendChild(buildCricketCard(match, false)));
  el.innerHTML = '';
  el.appendChild(list);
}

const IPL_TEAMS = {
  'mumbai indians':              { abbr: 'MI',   bg: '#004BA0', color: '#D1AB3E' },
  'chennai super kings':         { abbr: 'CSK',  bg: '#FFCA05', color: '#004B8D' },
  'royal challengers bengaluru': { abbr: 'RCB',  bg: '#E2003B', color: '#FFD700' },
  'royal challengers bangalore': { abbr: 'RCB',  bg: '#E2003B', color: '#FFD700' },
  'kolkata knight riders':       { abbr: 'KKR',  bg: '#3A1F6E', color: '#D4AF37' },
  'delhi capitals':              { abbr: 'DC',   bg: '#17449B', color: '#EF4C23' },
  'sunrisers hyderabad':         { abbr: 'SRH',  bg: '#F05A28', color: '#1B1B1B' },
  'punjab kings':                { abbr: 'PBKS', bg: '#C8102E', color: '#FFFFFF' },
  'rajasthan royals':            { abbr: 'RR',   bg: '#254AA5', color: '#EA1D8B' },
  'lucknow super giants':        { abbr: 'LSG',  bg: '#4B3F91', color: '#00B4D8' },
  'gujarat titans':              { abbr: 'GT',   bg: '#1C2951', color: '#02B4CE' },
};

const COUNTRY_FLAGS = {
  'india': 'in', 'australia': 'au', 'england': 'gb', 'pakistan': 'pk',
  'south africa': 'za', 'new zealand': 'nz', 'sri lanka': 'lk',
  'bangladesh': 'bd', 'zimbabwe': 'zw', 'afghanistan': 'af', 'ireland': 'ie',
  'netherlands': 'nl', 'nepal': 'np', 'usa': 'us', 'canada': 'ca',
  'uae': 'ae', 'oman': 'om', 'namibia': 'na', 'scotland': 'gb',
};

function getCricketTeamVisual(teamName, sizeClass) {
  const key = (teamName || '').toLowerCase();
  const ipl = IPL_TEAMS[key];
  if (ipl) {
    return `<div class="cricket-badge ${sizeClass}" style="background:${ipl.bg};color:${ipl.color}">${ipl.abbr}</div>`;
  }
  const flagCode = COUNTRY_FLAGS[key];
  if (flagCode) {
    return `<img class="cricket-flag ${sizeClass}" src="https://flagcdn.com/w80/${flagCode}.png" alt="${teamName}" onerror="this.style.display='none'">`;
  }
  const abbr = (teamName || '??').substring(0, 2).toUpperCase();
  return `<div class="cricket-badge ${sizeClass}" style="background:#2a2a2a;color:#aaa">${abbr}</div>`;
}

function getTeamScore(scores, teamName) {
  const t = (teamName || '').toLowerCase();
  const innings = scores.filter(s => (s.inning || '').toLowerCase().startsWith(t));
  if (!innings.length) return null;
  const last = innings[innings.length - 1];
  return `${last.r}/${last.w}`;
}

function getTeamOvers(scores, teamName) {
  const t = (teamName || '').toLowerCase();
  const innings = scores.filter(s => (s.inning || '').toLowerCase().startsWith(t));
  if (!innings.length) return null;
  const last = innings[innings.length - 1];
  return last.o != null ? String(last.o) : null;
}

function buildCricketCard(match, large) {
  const card = document.createElement('div');
  card.className = `match-card focusable${large ? ' cricket-large' : ''}`;
  card.tabIndex = 0;

  const teams = match.teams || [];
  const t1 = teams[0] || '';
  const t2 = teams[1] || '';
  const scores = match.score || [];
  const s1 = getTeamScore(scores, t1);
  const s2 = getTeamScore(scores, t2);
  const ov1 = getTeamOvers(scores, t1);
  const ov2 = getTeamOvers(scores, t2);
  const sz = large ? 'crest-lg' : 'crest-md';

  card.innerHTML = `<div class="inner">
    <div class="live-bar">
      <span class="live-dot"></span>
      <span class="live-text">LIVE</span>
    </div>
    <div class="card-teams">
      <div class="card-team">
        <div class="cricket-team-top">
          ${getCricketTeamVisual(t1, sz)}
          <div class="cricket-score-block">
            <div class="cricket-card-score">${s1 || '–'}</div>
            ${ov1 ? `<div class="cricket-card-overs">${ov1} ov</div>` : ''}
          </div>
        </div>
        <div class="card-team-name">${t1}</div>
      </div>
      <div class="card-center cricket-center">
        <div class="cricket-vs">vs</div>
      </div>
      <div class="card-team">
        <div class="cricket-team-top">
          <div class="cricket-score-block">
            <div class="cricket-card-score">${s2 || '–'}</div>
            ${ov2 ? `<div class="cricket-card-overs">${ov2} ov</div>` : ''}
          </div>
          ${getCricketTeamVisual(t2, sz)}
        </div>
        <div class="card-team-name">${t2}</div>
      </div>
    </div>
  </div>`;

  card.addEventListener('click', () => openCricketDetail(match));
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCricketDetail(match); } });
  return card;
}

function openCricketDetail(match) {
  const matchName = match.name || (match.teams || []).join(' vs ');
  const type = (match.matchType || 'Cricket').toUpperCase();
  document.getElementById('detail-competition-header').textContent = type;

  const scores = match.score || [];
  const hasScores = scores.length > 0;

  const inningRows = scores.map(s => `
    <div class="cricket-inning-row">
      <div class="cricket-inning-label">${shortInning(s.inning)}</div>
      <div class="cricket-inning-score">${s.r}/${s.w}</div>
      <div class="cricket-inning-overs">${s.o} overs</div>
    </div>`).join('');

  document.getElementById('match-detail-content').innerHTML = `
    <div class="detail-wrap">
      <div class="detail-unified-card">
        <div class="inner">
          <div class="live-bar">
            <span class="live-dot"></span>
            <span class="live-text">LIVE · ${type}</span>
          </div>
          <div class="cricket-detail-title">${matchName}</div>
          ${hasScores ? `
            <div class="detail-divider"></div>
            <div class="cricket-detail-innings">
              ${inningRows}
            </div>
          ` : `
            <div class="detail-divider"></div>
            <div class="cricket-no-score" style="text-align:center;padding:16px 0">Innings yet to begin</div>
          `}
        </div>
      </div>
    </div>`;

  showScreen('match-detail', 'cricket');
}

// ── Helpers ────────────────────────────────────────────────────
function formatNextMatch(match) {
  if (!match) return null;
  const home = match.homeTeam?.shortName || match.homeTeam?.name || '';
  const away = match.awayTeam?.shortName || match.awayTeam?.name || '';
  const date = new Date(match.utcDate);
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `Next: ${home} vs ${away} · ${day} ${time}`;
}

function shortInning(inning) {
  if (!inning) return '';
  return inning.replace(/\s+inning\s*\d*/i, '').trim();
}

// ── Settings ───────────────────────────────────────────────────
function syncSettings() {
  const t = document.getElementById('toggle-always-on');
  t.textContent = state.alwaysOn ? 'ON' : 'OFF';
  t.className = 'setting-toggle' + (state.alwaysOn ? ' on' : '');
  document.getElementById('value-default-sport').textContent =
    state.defaultSport ? state.defaultSport[0].toUpperCase() + state.defaultSport.slice(1) : 'None';
}

// ── D-pad ──────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const dialogOpen = !document.getElementById('dialog-default').classList.contains('hidden');
  const scope = dialogOpen ? '#dialog-default' : '#screen-' + state.currentScreen;
  const focusables = Array.from(document.querySelectorAll(scope + ' .focusable'));
  const idx = focusables.indexOf(document.activeElement);
  switch (e.key) {
    case 'ArrowDown':  e.preventDefault(); if (idx < focusables.length - 1) focusables[idx + 1].focus(); break;
    case 'ArrowUp':    e.preventDefault(); if (idx > 0) focusables[idx - 1].focus(); break;
    case 'ArrowLeft':
    case 'Escape':     goBack(); break;
    case 'ArrowRight':
    case 'Enter':
    case ' ':
      if (document.activeElement && document.activeElement !== document.body) { e.preventDefault(); document.activeElement.click(); }
      break;
  }
});

// ── Wire buttons ───────────────────────────────────────────────
document.getElementById('btn-football').addEventListener('click', () => selectSport('football'));
document.getElementById('btn-cricket').addEventListener('click', () => selectSport('cricket'));
document.getElementById('btn-back-football').addEventListener('click', goBack);
document.getElementById('btn-back-cricket').addEventListener('click', goBack);
document.getElementById('btn-back-detail').addEventListener('click', goBack);
document.getElementById('btn-back-settings').addEventListener('click', goBack);
document.getElementById('btn-settings-home').addEventListener('click', () => showScreen('settings', 'home'));
document.getElementById('btn-settings-football').addEventListener('click', () => showScreen('settings', 'football'));
document.getElementById('btn-settings-cricket').addEventListener('click', () => showScreen('settings', 'cricket'));
document.getElementById('setting-always-on').addEventListener('click', () => { state.alwaysOn = !state.alwaysOn; localStorage.setItem('alwaysOn', state.alwaysOn); syncSettings(); });
document.getElementById('setting-clear-default').addEventListener('click', () => { state.defaultSport = null; localStorage.removeItem('defaultSport'); syncSettings(); });
document.getElementById('btn-set-default').addEventListener('click', () => { state.defaultSport = state.pendingDefaultSport; localStorage.setItem('defaultSport', state.defaultSport); document.getElementById('dialog-default').classList.add('hidden'); syncSettings(); });
document.getElementById('btn-skip-default').addEventListener('click', () => document.getElementById('dialog-default').classList.add('hidden'));

// ── Boot ───────────────────────────────────────────────────────
syncSettings();
if (state.defaultSport) selectSport(state.defaultSport);
else showScreen('home');
