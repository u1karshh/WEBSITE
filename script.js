const fallback = {
  fixtures: [
    { home: 'France', away: 'Spain', homeCode: 'FR', awayCode: 'ES', date: '14 JUL', time: '20:00', startTime: '2026-07-15T01:00:00Z', venue: 'Dallas Stadium', status: 'Semi-final 01' },
    { home: 'England', away: 'Argentina', homeCode: 'EN', awayCode: 'AR', date: '15 JUL', time: '20:00', startTime: '2026-07-16T00:00:00Z', venue: 'Atlanta Stadium', status: 'Semi-final 02' }
  ],
  events: [
    { minute: '—', type: 'info', title: 'Match centre is standing by', detail: 'Team news, line-ups and live events will appear here at kick-off.' },
    { minute: '—', type: 'info', title: 'Semi-final 01', detail: 'France v Spain · Dallas Stadium' },
    { minute: '—', type: 'info', title: 'Semi-final 02', detail: 'England v Argentina · Atlanta Stadium' }
  ]
};

const flags = { France:'flag-fr', Spain:'flag-es', England:'flag-en', Argentina:'flag-ar' };
const timeline = document.querySelector('#timeline-list');
const fixtureList = document.querySelector('#fixture-list');
const toast = document.querySelector('#toast');
let currentEvents = fallback.events;
let eventIndex = 0;
const timeZones = [
  ['Local', 'local'], ['UTC', 'UTC'], ['IST', 'Asia/Kolkata'],
  ['ET', 'America/New_York'], ['CT', 'America/Chicago'], ['UK', 'Europe/London']
];

document.head.insertAdjacentHTML('beforeend', `<style>
  .flag-en{background:linear-gradient(45deg,transparent 46%,#c9192d 47% 53%,transparent 54%),linear-gradient(-45deg,transparent 46%,#c9192d 47% 53%,transparent 54%),#f1f1ed!important;color:#111}
  .flag-ar{background:linear-gradient(#75b8df 33%,#fff 33% 66%,#75b8df 66%)!important;color:#222}
  
  /* Rounded corners for a softer UI */
  .hidden {
    display: none !important;
  }
  :root { --border-radius: 8px; }
  button, .button, input, select, textarea, dialog, .fixture, .event, .panel, .tabs button, #toast, .stat .bar, .next-match, .command-deck, .player-card, .player-cards, .round article {
    border-radius: var(--border-radius);
  }
  .fixture, .event, .panel, .stat .bar, dialog, .next-match, .command-deck, .player-card, .player-cards {
    overflow: hidden; /* Prevents content from spilling out of rounded corners */
  }
</style>`);

function showToast(text) { toast.textContent = text; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function updateBackendStatusLabel() {
  const status = document.querySelector('#update-status');
  if (status) {
    status.textContent = `Last updated from backend: ${new Date().toLocaleString()}`;
  }
}
function flagClass(name) { return flags[name] || 'flag-fr'; }
function formatKickoff(fixture, timeZone = 'local') {
  if (!fixture.startTime) return `${fixture.date} · ${fixture.time}`;
  const options = { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:false };
  if (timeZone !== 'local') options.timeZone = timeZone;
  return new Intl.DateTimeFormat('en-GB', options).format(new Date(fixture.startTime)).replace(',', ' ·').toUpperCase();
}
function formatAllKickoffs(fixture) {
  return timeZones.map(([label, zone]) => `<span><b>${label}</b> ${formatKickoff(fixture, zone)}</span>`).join('');
}
function renderTimeline(events) {
  currentEvents = events.length ? events : fallback.events;
  timeline.innerHTML = currentEvents.map(event => `<article class="event"><time>${event.minute || '—'}</time><div class="event-type"><span class="event-icon ${event.type || ''}">${event.type === 'goal' ? '●' : event.type === 'sub' ? '⇄' : 'i'}</span><b>${event.title}</b></div><span class="event-detail">${event.detail || ''}</span></article>`).join('');
  updateEventCursor();
}
function renderFixtures(fixtures) {
  fixtureList.innerHTML = fixtures.map((f, index) => `<article class="fixture"><time class="fixture-timezones">${formatAllKickoffs(f)}</time><div class="side"><span class="flag mini-flag ${flagClass(f.home)}">${f.homeCode}</span>${f.home}</div><div class="side">${f.away}<span class="flag mini-flag ${flagClass(f.away)}">${f.awayCode}</span></div><span class="tag">${f.status || `Semi-final 0${index + 1}`}</span></article>`).join('');
}
function updateEventCursor() { const event = currentEvents[eventIndex] || currentEvents[0]; document.querySelector('#event-minute').textContent = event.minute === '—' ? 'PRE-MATCH' : `${event.minute}'`; }
function renderLineups(home = [], away = []) {
  const makePlayers = players => players.length ? players.map((p, i) => `<div class="player"><b>${p.number || String(i + 1).padStart(2, '0')}</b><span>${p.name}</span>${p.note ? `<span class="sub-note">${p.note}</span>` : ''}</div>`).join('') : '<div class="player"><span>Official line-up not yet available</span></div>';
  document.querySelector('#home-lineup').innerHTML = makePlayers(home);
  document.querySelector('#away-lineup').innerHTML = makePlayers(away);
}
function renderStats(stats = []) {
  const defaults = [{label:'Possession',home:50,away:50},{label:'Shots',home:0,away:0},{label:'Pass accuracy',home:0,away:0}];
  document.querySelector('#stat-board').innerHTML = (stats.length ? stats : defaults).map(s => { const home = parseFloat(s.home) || 0, away = parseFloat(s.away) || 0, total = home + away || 1, width = (home / total) * 100; return `<div class="stat"><label>${s.label}</label><b>${s.home}${s.label === 'Possession' || s.label === 'Pass accuracy' ? '%' : ''}</b><div class="bar"><i style="width:${width}%"></i><i style="width:${100-width}%"></i></div><b>${s.away}${s.label === 'Possession' || s.label === 'Pass accuracy' ? '%' : ''}</b></div>`; }).join('');
}
function setPrimary(fixture) {
  if (!fixture) return;
  document.querySelector('#home-name').textContent = fixture.home;
  document.querySelector('#away-name').textContent = fixture.away;
  document.querySelector('#primary-status').textContent = fixture.status || 'MATCH CENTRE';
  document.querySelector('#primary-detail').textContent = fixture.venue || 'FIFA World Cup 26™';
  document.querySelector('#home-score').textContent = fixture.homeScore ?? '—';
  document.querySelector('#away-score').textContent = fixture.awayScore ?? '—';
  document.querySelector('#match-time').textContent = fixture.liveClock || `${fixture.date} · ${fixture.time}`;
}
async function fetchLiveData() {
  const status = document.querySelector('#connection-status');
  status.textContent = 'SYNCING';
  try {
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard', { cache: 'no-store' });
    if (!response.ok) throw new Error('Feed unavailable');
    const data = await response.json();
    const events = data.events || [];
    const relevant = events.filter(e => /France|Spain|England|Argentina/.test(e.name || '')).map(e => {
      const c = e.competitions?.[0]?.competitors || [];
      const home = c.find(t => t.homeAway === 'home') || {}, away = c.find(t => t.homeAway === 'away') || {};
      const d = new Date(e.date);
      return { home:home.team?.displayName || 'TBD', away:away.team?.displayName || 'TBD', homeCode:home.team?.abbreviation || '', awayCode:away.team?.abbreviation || '', homeScore:home.score, awayScore:away.score, date:d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}).toUpperCase(), time:d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), startTime:e.date, liveClock:e.status?.type?.detail, venue:e.competitions?.[0]?.venue?.fullName, status:e.status?.type?.shortDetail || 'FIFA WORLD CUP 26', eventId:e.id };
    });
    if (!relevant.length) throw new Error('No live semi-final feed');
    renderFixtures(relevant); setPrimary(relevant[0]);
    try { await fetchMatchDetails(relevant[0].eventId); } catch { renderTimeline(fallback.events); renderLineups(); renderStats(); }
    status.textContent = 'LIVE DATA';
  } catch (error) {
    renderFixtures(fallback.fixtures); setPrimary(fallback.fixtures[0]); renderTimeline(fallback.events); renderLineups(); renderStats(); status.textContent = 'SCHEDULE MODE';
  }
  updateBackendStatusLabel();
  document.querySelector('#updated-time').textContent = `Updated ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
}
async function fetchMatchDetails(id) {
  if (!id) return;
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${id}`, {cache:'no-store'});
  if (!response.ok) return;
  const data = await response.json();
  const plays = (data.plays || []).map(p => ({minute:p.clock?.displayValue || '—',type:p.scoringPlay?'goal':/substitution/i.test(p.text || '')?'sub':'info',title:p.text || p.type?.text || 'Match event',detail:p.team?.displayName || ''})).reverse();
  renderTimeline(plays);
  const rosters = data.rosters || [];
  renderLineups(rosters[0]?.roster?.map(p => ({number:p.athlete?.jersey,name:p.athlete?.displayName,note:p.subbedIn ? 'ON' : ''})) || [], rosters[1]?.roster?.map(p => ({number:p.athlete?.jersey,name:p.athlete?.displayName,note:p.subbedIn ? 'ON' : ''})) || []);
  const stats = (data.boxscore?.teams || []).length === 2 ? data.boxscore.teams[0].statistics.slice(0,3).map((s,i) => ({label:s.label,home:s.displayValue,away:data.boxscore.teams[1].statistics[i]?.displayValue || '—'})) : [];
  renderStats(stats);
}

const welcomeOverlay = document.querySelector('#welcome-overlay');
const footballButton = document.querySelector('#choose-football');
const cricketButton = document.querySelector('#choose-cricket');

if (welcomeOverlay && footballButton) {
  footballButton.addEventListener('click', () => {
    welcomeOverlay.classList.add('hidden');
  });
}

if (cricketButton) {
  cricketButton.addEventListener('click', () => {
    window.location.href = 'cricket.html';
  });
}

document.querySelectorAll('.tabs button').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.tabs button,.panel').forEach(el => el.classList.remove('selected')); button.classList.add('selected'); document.querySelector(`#${button.dataset.panel}`).classList.add('selected'); }));
document.querySelector('#prev-event').addEventListener('click', () => { eventIndex = Math.max(0, eventIndex - 1); updateEventCursor(); });
document.querySelector('#next-event').addEventListener('click', () => { eventIndex = Math.min(currentEvents.length - 1, eventIndex + 1); updateEventCursor(); });
document.querySelector('#watch-match').addEventListener('click', () => document.querySelector('#match-centre').scrollIntoView({behavior:'smooth'}));
document.querySelector('#refresh-button').addEventListener('click', () => { fetchLiveData(); showToast('Refreshing match data…'); });
renderStats(); fetchLiveData(); setInterval(fetchLiveData, 60000);
