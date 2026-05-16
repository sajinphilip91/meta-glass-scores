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
  let min = '';
  if (match.minute != null) {
    min = match.minute + "'";
  } else if (match.status === 'PAUSED') {
    min = 'HT';
  } else if (match.status === 'EXTRA_TIME') {
    min = 'ET';
  } else if (match.status === 'PENALTY_SHOOTOUT') {
    min = 'PSO';
  } else if (match.status === 'IN_PLAY' && match.utcDate) {
    const elapsed = Math.floor((Date.now() - new Date(match.utcDate)) / 60000);
    min = (elapsed >= 0 && elapsed <= 120) ? elapsed + "'" : 'LIVE';
  } else if (match.status === 'IN_PLAY') {
    min = 'LIVE';
  }
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
function renderFootballDetailCard(match, goals) {
  const home = match.homeTeam;
  const away = match.awayTeam;
  const homeGoals = goals.filter(g => g.team?.id === home.id);
  const awayGoals = goals.filter(g => g.team?.id === away.id);

  const scorerHTML = (goalList) => goalList.map(g => {
    const name = g.scorer?.name || '';
    const min = g.minute != null ? g.minute + "'" + (g.injuryTime ? ' +' + g.injuryTime : '') : '';
    return `<div class="scorer-name">${name}<span class="minute"> ${min}</span></div>`;
  }).join('');

  const hasGoals = goals.length > 0;

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
          </div>` : '<div class="detail-divider"></div><div class="scorer-loading">No goals yet</div>'}
        </div>
      </div>
    </div>`;
}

async function openFootballDetail(match) {
  document.getElementById('detail-competition-header').textContent = match.competition?.name || 'Football';
  renderFootballDetailCard(match, match.goals || []);
  showScreen('match-detail', 'football');

  if (!match.id) return;
  try {
    const res = await fetch(`/api/football-match?id=${match.id}`);
    if (!res.ok) return;
    const full = await res.json();
    if (state.currentScreen === 'match-detail') {
      renderFootballDetailCard(full, full.goals || []);
    }
  } catch { }
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
    teamInfo: [
      { name: 'Mumbai Indians', shortname: 'MI', img: '' },
      { name: 'Chennai Super Kings', shortname: 'CSK', img: '' },
    ],
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
    teamInfo: [
      { name: 'India', shortname: 'IND', img: '' },
      { name: 'Australia', shortname: 'AUS', img: '' },
    ],
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

function ordinalOver(overs) {
  if (overs == null) return null;
  const n = Math.ceil(parseFloat(overs));
  if (!n) return null;
  const suffix = (n % 100 >= 11 && n % 100 <= 13) ? 'th'
    : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${suffix} OVER`;
}

function buildCricketCard(match, large) {
  const card = document.createElement('div');
  card.className = `match-card focusable${large ? ' cricket-large' : ''}`;
  card.tabIndex = 0;

  const teams    = match.teams    || [];
  const teamInfo = match.teamInfo || [];
  const t1 = teams[0] || '';
  const t2 = teams[1] || '';

  const info1 = teamInfo.find(t => t.name === t1) || {};
  const info2 = teamInfo.find(t => t.name === t2) || {};
  const short1 = info1.shortname || IPL_TEAMS[t1.toLowerCase()]?.abbr || t1.substring(0, 3).toUpperCase();
  const short2 = info2.shortname || IPL_TEAMS[t2.toLowerCase()]?.abbr || t2.substring(0, 3).toUpperCase();

  const scores = match.score || [];
  const s1 = scores.find(s => (s.inning || '').toLowerCase().startsWith(t1.toLowerCase()));
  const s2 = scores.find(s => (s.inning || '').toLowerCase().startsWith(t2.toLowerCase()));

  const logoHTML = (teamName) => {
    const key = teamName.toLowerCase();
    const ipl = IPL_TEAMS[key];
    if (ipl) return `<div class="cc-logo cc-badge" style="background:${ipl.bg};color:${ipl.color}">${ipl.abbr}</div>`;
    const flagCode = COUNTRY_FLAGS[key];
    if (flagCode) return `<img class="cc-logo cc-flag" src="https://flagcdn.com/w80/${flagCode}.png" alt="" onerror="this.style.display='none'">`;
    return `<div class="cc-logo cc-badge" style="background:#2a2a2a;color:#aaa">${teamName.substring(0, 2).toUpperCase()}</div>`;
  };

  const scoreHTML = s => s
    ? `<div class="cc-runs">${s.r}/${s.w}</div><div class="cc-label">${s.o} OVERS</div>`
    : `<div class="cc-dashes">— — —</div><div class="cc-label">YET TO BAT</div>`;

  const type = (match.matchType || '').toLowerCase();
  const totalOvers = (type === 't20' || type === 't20i') ? 20 : type === 'odi' ? 50 : null;

  const ballsRemaining = (s) => {
    if (!totalOvers) return null;
    if (!s) return totalOvers * 6;
    const o = parseFloat(s.o) || 0;
    const bowled = Math.floor(o) * 6 + Math.round((o % 1) * 10);
    return Math.max(0, totalOvers * 6 - bowled);
  };

  let target = null;
  if (s1 && !s2) {
    const balls = ballsRemaining(null);
    const suffix = balls ? ` · ${balls} balls` : '';
    target = `🎯 ${short2} need ${s1.r + 1} to win${suffix}`;
  } else if (s1 && s2) {
    const needed = s1.r - s2.r + 1;
    if (needed > 0) {
      const balls = ballsRemaining(s2);
      const suffix = balls ? ` · ${balls} balls left` : '';
      target = `🎯 ${short2} need ${needed} to win${suffix}`;
    }
  }

  card.innerHTML = `<div class="inner">
    <div class="cc-header">
      <div class="cc-live"><span class="live-dot"></span><span class="live-text">LIVE</span></div>
    </div>
    <div class="cc-teams-row">
      <div class="cc-team-left">
        ${logoHTML(t1)}
        <div class="cc-abbr">${short1}</div>
      </div>
      <div class="cc-vs-circle">VS</div>
      <div class="cc-team-right">
        <div class="cc-abbr">${short2}</div>
        ${logoHTML(t2)}
      </div>
    </div>
    <div class="cc-scores-row">
      <div class="cc-score-left">${scoreHTML(s1)}</div>
      <div class="cc-score-right">${scoreHTML(s2)}</div>
    </div>
    ${target ? `<div class="cc-target-bar">${target}</div>` : ''}
  </div>`;

  card.addEventListener('click', () => openCricketDetail(match));
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCricketDetail(match); } });
  return card;
}

function renderCricketDetailFull(full) {
  const teams  = full.teams || [];
  const t1name = teams[0] || '';
  const t2name = teams[1] || '';
  const info   = full.teamInfo || [];
  const t1info = info.find(t => t.name === t1name) || {};
  const t2info = info.find(t => t.name === t2name) || {};

  const scores = full.score || [];
  const s1 = scores.find(s => (s.inning || '').startsWith(t1name));
  const s2 = scores.find(s => (s.inning || '').startsWith(t2name));

  const sc = full.scorecard || [];
  const currentInning = sc[sc.length - 1] || {};
  const batting  = currentInning.batting  || [];
  const bowling  = currentInning.bowling  || [];
  const inningLabel = (currentInning.inning || '').replace(/\s+inning\s*\d*/i, '').trim();
  const bowlingTeam = inningLabel === t1name ? t2name : t1name;

  const currentBatsmen = batting.filter(b => b['dismissal-text'] === 'batting');
  const topBowlers = bowling.slice().sort((a, b) => b.o - a.o).slice(0, 3);

  const logoHTML = info => info.img
    ? `<img class="cd-logo" src="${info.img}" alt="" onerror="this.style.display='none'">`
    : `<div class="cd-logo cd-logo-badge">${(info.name||'?').substring(0,2).toUpperCase()}</div>`;

  const scoreBlock = (s, align) => s
    ? `<div class="cd-score-block ${align}"><div class="cd-runs">${s.r}/${s.w}</div><div class="cd-overs">${s.o} ov</div></div>`
    : `<div class="cd-score-block ${align}"><div class="cd-yet">Yet to bat</div></div>`;

  const battingRows = currentBatsmen.map(b =>
    `<div class="cd-row"><div class="cd-pname">● ${b.batsman.name}</div><div class="cd-pstat">${b.r} <span class="cd-pball">(${b.b})</span></div></div>`
  ).join('');

  const bowlingRows = topBowlers.map(b =>
    `<div class="cd-row"><div class="cd-pname">${b.bowler.name}</div><div class="cd-pstat">${b.o}-${b.m}-${b.r}-${b.w}</div></div>`
  ).join('');

  const venue = full.venue || '';
  const status = full.status || '';

  document.getElementById('match-detail-content').innerHTML = `
    <div class="cd-wrap">
      <div class="cd-teams-row">
        <div class="cd-team-col">
          ${logoHTML(t1info)}
          <div class="cd-short">${t1info.shortname || t1name.substring(0,3).toUpperCase()}</div>
        </div>
        <div class="cd-vs">vs</div>
        <div class="cd-team-col right">
          <div class="cd-short">${t2info.shortname || t2name.substring(0,3).toUpperCase()}</div>
          ${logoHTML(t2info)}
        </div>
      </div>

      <div class="cd-scores-row">
        ${scoreBlock(s1, '')}
        ${scoreBlock(s2, 'right')}
      </div>

      ${status ? `<div class="cd-status">${status}</div>` : ''}

      ${battingRows ? `
        <div class="cd-divider"></div>
        <div class="cd-section-title">${inningLabel} BATTING</div>
        ${battingRows}` : ''}

      ${bowlingRows ? `
        <div class="cd-divider"></div>
        <div class="cd-section-title">${bowlingTeam} BOWLING</div>
        ${bowlingRows}` : ''}

      ${venue ? `<div class="cd-divider"></div><div class="cd-venue">📍 ${venue}</div>` : ''}
    </div>`;
}

async function openCricketDetail(match) {
  const type = (match.matchType || 'Cricket').toUpperCase();
  document.getElementById('detail-competition-header').textContent = type;
  document.getElementById('match-detail-content').innerHTML = '<div class="loading">Loading…</div>';
  showScreen('match-detail', 'cricket');

  if (!match.id) return;
  try {
    const res = await fetch(`/api/cricket-scorecard?id=${match.id}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (state.currentScreen === 'match-detail') {
      renderCricketDetailFull(data.data || {});
    }
  } catch {
    const scores = match.score || [];
    document.getElementById('match-detail-content').innerHTML = `
      <div class="cd-wrap">
        ${scores.map(s => `
          <div class="cd-row">
            <div class="cd-pname">${shortInning(s.inning)}</div>
            <div class="cd-pstat">${s.r}/${s.w} <span class="cd-pball">${s.o} ov</span></div>
          </div>`).join('')}
      </div>`;
  }
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
