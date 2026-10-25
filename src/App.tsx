import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownUp, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Flag, History, House, Menu, Settings2, ShieldCheck, Trophy, Users, X } from 'lucide-react'
import './App.css'

type Team = { id: string; name: string; city: string; color: string; mark: string }
type Game = { id: string; away: Team; home: Team; kickoff: string; window: 'EARLY' | 'LATE' | 'NIGHT'; status: 'UPCOMING' | 'LIVE' | 'FINAL'; score?: [number, number] }

const teams: Record<string, Team> = {
  buf: { id: 'buf', name: 'Bills', city: 'Buffalo', color: '#17408b', mark: 'BUF' },
  car: { id: 'car', name: 'Panthers', city: 'Carolina', color: '#0085ca', mark: 'CAR' },
  cle: { id: 'cle', name: 'Browns', city: 'Cleveland', color: '#311d00', mark: 'CLE' },
  dal: { id: 'dal', name: 'Cowboys', city: 'Dallas', color: '#003594', mark: 'DAL' },
  den: { id: 'den', name: 'Broncos', city: 'Denver', color: '#fb4f14', mark: 'DEN' },
  gb: { id: 'gb', name: 'Packers', city: 'Green Bay', color: '#203731', mark: 'GB' },
  kc: { id: 'kc', name: 'Chiefs', city: 'Kansas City', color: '#e31837', mark: 'KC' },
  mia: { id: 'mia', name: 'Dolphins', city: 'Miami', color: '#008e97', mark: 'MIA' },
  min: { id: 'min', name: 'Vikings', city: 'Minnesota', color: '#4f2683', mark: 'MIN' },
  ne: { id: 'ne', name: 'Patriots', city: 'New England', color: '#002244', mark: 'NE' },
  nyg: { id: 'nyg', name: 'Giants', city: 'New York', color: '#0b2265', mark: 'NYG' },
  phi: { id: 'phi', name: 'Eagles', city: 'Philadelphia', color: '#004c54', mark: 'PHI' },
  sf: { id: 'sf', name: '49ers', city: 'San Francisco', color: '#aa0000', mark: 'SF' },
}

const games: Game[] = [
  { id: 'g1', away: teams.buf, home: teams.car, kickoff: '1:00 PM', window: 'EARLY', status: 'UPCOMING' },
  { id: 'g2', away: teams.ne, home: teams.cle, kickoff: '1:00 PM', window: 'EARLY', status: 'UPCOMING' },
  { id: 'g3', away: teams.gb, home: teams.mia, kickoff: '1:00 PM', window: 'EARLY', status: 'UPCOMING' },
  { id: 'g4', away: teams.min, home: teams.phi, kickoff: '4:25 PM', window: 'LATE', status: 'UPCOMING' },
  { id: 'g5', away: teams.den, home: teams.dal, kickoff: '4:25 PM', window: 'LATE', status: 'UPCOMING' },
  { id: 'g6', away: teams.sf, home: teams.kc, kickoff: '8:20 PM', window: 'NIGHT', status: 'UPCOMING' },
]

const members = [
  { id: 'you', name: 'You', initials: 'DV', color: '#b74732' },
  { id: 'mike', name: 'Mike', initials: 'MK', color: '#426d59' },
  { id: 'jen', name: 'Aunt Jen', initials: 'AJ', color: '#7b5c3f' },
  { id: 'pops', name: 'Pops', initials: 'PO', color: '#537088' },
]

const initialPicks: Record<string, Record<string, string>> = {
  you: { g1: 'buf', g2: 'ne', g3: 'mia', g4: 'phi' },
  mike: { g1: 'car', g2: 'ne', g3: 'gb', g5: 'dal' },
  jen: { g1: 'buf', g2: 'cle', g3: 'mia', g4: 'min', g6: 'kc' },
  pops: { g1: 'buf', g3: 'gb', g4: 'phi', g5: 'den' },
}

type Tab = 'games' | 'family' | 'standings' | 'history' | 'league'
const tabs: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'games', label: 'Sunday Games', icon: House },
  { id: 'family', label: 'Family Picks', icon: Users },
  { id: 'standings', label: 'Standings', icon: Trophy },
  { id: 'history', label: 'History', icon: History },
]

function loadPicks() {
  try {
    const stored = localStorage.getItem('sunday-pickem-picks-v1')
    return stored ? JSON.parse(stored) as typeof initialPicks : initialPicks
  } catch {
    return initialPicks
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('games')
  const [filter, setFilter] = useState('ALL GAMES')
  const [picks, setPicks] = useState(loadPicks)
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [mobileMenu, setMobileMenu] = useState(true)
  const supabaseReady = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY)

  useEffect(() => { localStorage.setItem('sunday-pickem-picks-v1', JSON.stringify(picks)) }, [picks])

  const yourPicks = picks.you ?? {}
  const submitted = Object.keys(yourPicks).length
  const ranked = useMemo(() => members.map((member) => ({ ...member, total: Object.keys(picks[member.id] ?? {}).length, correct: member.id === 'you' ? 3 : member.id === 'mike' ? 4 : 3 })).sort((a, b) => b.correct - a.correct), [picks])

  const chooseWinner = (game: Game, teamId: string) => {
    setPicks((current) => ({ ...current, you: { ...current.you, [game.id]: teamId } }))
    setNotice(`${teams[teamId]?.city} ${teams[teamId]?.name} pick saved`)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const filteredGames = games.filter((game) => filter === 'ALL GAMES' || (filter === 'UNPICKED' && !yourPicks[game.id]) || (filter === 'LIVE' && game.status === 'LIVE') || (filter === 'FINAL' && game.status === 'FINAL'))

  return (
    <div className="app-shell">
      <div className="topline"><span><span className="signal-dot" /> {supabaseReady ? 'DEMO MODE · SUPABASE KEYS DETECTED' : 'DEMO MODE'} <i /> SUNDAY, OCTOBER 25, 2026</span><span className="topline-right"><ShieldCheck size={13} /> PICKS LOCK AT KICKOFF <i /> LEAGUE TIME: EASTERN</span></div>
      <header className="masthead">
        <div className="brand-lockup"><div className="brand-mark"><span>SP</span><Flag size={14} /></div><div><div className="brand-title">SUNDAY <em>PICK'EM</em></div><div className="brand-subtitle">THE FAMILY FOOTBALL CLUB <b>•</b> EST. 2026</div></div></div>
        <div className="scorebug"><div className="scorebug-label">WEEK <b>08</b><span>•</span> REGULAR SEASON</div><div className="scorebug-main"><strong>4</strong><small>OF</small><strong>6</strong><span className="scorebug-divider" /><div><b>PICKS IN</b><small>2 LEFT TO CALL</small></div></div></div>
        <div className="profile-chip"><div className="avatar avatar-you">DV</div><div><b>Danielle</b><small>COMMISSIONER</small></div><ChevronDown size={15} /></div>
        <button className="mobile-menu icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation"><Menu size={20} /></button>
      </header>
      <nav className={`main-nav ${mobileMenu ? 'nav-open' : ''}`} aria-label="Main navigation">
        <div className="nav-inner">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-tab ${activeTab === id ? 'active' : ''}`} onClick={() => { setActiveTab(id); setMobileMenu(false) }}><Icon size={16} strokeWidth={2.2} />{label}{id === 'games' && <span className="tab-count">6</span>}</button>)}<button className={`nav-tab nav-settings ${activeTab === 'league' ? 'active' : ''}`} onClick={() => setActiveTab('league')}><Settings2 size={16} />League settings</button><span className="nav-spacer" /><span className="nav-week"><CalendarDays size={14} /> OCT 25 <ChevronDown size={13} /></span></div>
      </nav>

      <main className="page-wrap">
        <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> WEEK 08 <span className="eyebrow-dot">/</span> SUNDAY SLATE</div><h1>{activeTab === 'games' ? 'Call your shot.' : activeTab === 'family' ? 'The family board.' : activeTab === 'standings' ? 'The standings.' : activeTab === 'history' ? 'Back in the books.' : 'League house rules.'}</h1><p>{activeTab === 'games' ? 'Pick a winner for every Sunday matchup. Your call locks at kickoff.' : activeTab === 'family' ? 'Every pick on the board, side by side.' : activeTab === 'standings' ? 'One point for every right call. That’s the whole playbook.' : activeTab === 'history' ? 'Past Sundays, final scores, and the picks that made them.' : 'A private league for your Sunday crew.'}</p></div><div className="broadcast-stamp"><span>LIVE FROM</span><b>THE LIVING ROOM</b><small>WEEK 08 · 2026</small></div></section>

        {activeTab === 'games' && <>
          <section className="week-meter"><div className="meter-copy"><div className="meter-icon"><Check size={17} /></div><div><b>{submitted} OF {games.length} PICKS SUBMITTED</b><small>{games.length - submitted === 0 ? 'All calls are in. See you at kickoff.' : `${games.length - submitted} matchups still need your call.`}</small></div></div><div className="meter-progress" aria-label={`${submitted} of ${games.length} picks submitted`}><span style={{ width: `${(submitted / games.length) * 100}%` }} /></div><strong>{Math.round((submitted / games.length) * 100)}<small>%</small></strong></section>
          <section className="controls-row"><div className="filter-tabs" role="group" aria-label="Filter games">{['ALL GAMES', 'UNPICKED', 'LIVE', 'FINAL'].map((value) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{value}{value === 'ALL GAMES' && <span>06</span>}</button>)}</div><div className="sort-label"><ArrowDownUp size={13} /> KICKOFF ORDER</div></section>
          {filteredGames.length ? <div className="matchup-grid">{(['EARLY', 'LATE', 'NIGHT'] as const).map((window) => {
            const windowGames = filteredGames.filter((game) => game.window === window)
            if (!windowGames.length) return null
            return <section className="kickoff-section" key={window}><div className="kickoff-heading"><span className="kickoff-pill">{window === 'EARLY' ? '1:00 PM' : window === 'LATE' ? '4:25 PM' : '8:20 PM'} ET</span><span className="kickoff-rule" /><b>{window === 'EARLY' ? 'EARLY WINDOW' : window === 'LATE' ? 'AFTERNOON WINDOW' : 'SUNDAY NIGHT FOOTBALL'}</b><span className="kickoff-total">{windowGames.length} GAME{windowGames.length === 1 ? '' : 'S'}</span></div><div className="games-list">{windowGames.map((game) => <MatchupCard key={game.id} game={game} picked={yourPicks[game.id]} allPicks={picks} onPick={chooseWinner} onFamily={() => { setSelectedGame(game.id); setActiveTab('family') }} />)}</div></section>
          })}</div> : <div className="empty-state"><CircleHelp size={24} /><b>No games in this filter.</b><span>Try another view of the Sunday slate.</span></div>}
          <aside className="demo-note"><Activity size={15} /><span><b>FIXTURE SLATE</b> Schedule and kickoff data are sample fixtures for local demo. Connect an NFL data provider before using this as a live scoreboard.</span><button onClick={() => setActiveTab('league')}>SET UP LEAGUE <span>→</span></button></aside>
        </>}

        {activeTab === 'family' && <section className="content-board"><div className="board-toolbar"><div><span className="board-label">WEEK 08 PICKS</span><h2>Everybody's call</h2></div><span className="demo-tag">DEMO FAMILY</span></div>{games.map((game) => <FamilyGame key={game.id} game={game} picks={picks} selected={selectedGame === game.id} onPick={chooseWinner} />)}</section>}

        {activeTab === 'standings' && <div className="standings-layout"><section className="content-board standings-board"><div className="board-toolbar"><div><span className="board-label">WEEK 08 · DEMO STANDINGS</span><h2>Weekly standings</h2></div><button className="text-button" onClick={() => setActiveTab('history')}>SEASON TABLE <span>→</span></button></div><div className="table-head"><span>RANK / PLAYER</span><span>PICKS</span><span>POINTS</span><span>ACCURACY</span></div>{ranked.map((person, index) => <div className={`standings-row ${person.id === 'you' ? 'you-row' : ''}`} key={person.id}><div className="rank-person"><b className="rank-number">{index + 1}</b><div className="avatar small-avatar" style={{ background: person.color }}>{person.initials}</div><span><b>{person.name}</b>{person.id === 'you' && <small>THAT'S YOU</small>}</span></div><span className="stat-value">{person.total}<small> / 6</small></span><span className="points-value">{person.correct}<small> PTS</small></span><span className="accuracy-value">{Math.round((person.correct / Math.max(person.total, 1)) * 100)}<small>%</small></span></div>)}</section><aside className="champion-panel"><div className="champion-star"><Trophy size={23} /></div><span>SEASON RACE</span><h3>Every Sunday<br />counts.</h3><p>Keep stacking correct calls. The family champ gets bragging rights until next fall.</p><div className="champion-rule" /><div className="mini-leader"><span>TOP OF THE TABLE</span><b>Mike <strong>42 PTS</strong></b><div className="mini-bar"><i /></div><small>3 WEEKS IN FIRST</small></div><button onClick={() => setActiveTab('history')}>VIEW SEASON HISTORY <span>→</span></button></aside></div>}

        {activeTab === 'history' && <section className="content-board history-board"><div className="board-toolbar"><div><span className="board-label">ARCHIVE · DEMO FIXTURES · 2026 SEASON</span><h2>Past Sundays</h2></div><button className="select-week">2026 SEASON <ChevronDown size={14} /></button></div>{[{ week: 'WEEK 07', date: 'OCT 18, 2026', winner: 'Mike', points: 5 }, { week: 'WEEK 06', date: 'OCT 11, 2026', winner: 'Aunt Jen', points: 4 }].map((week) => <button key={week.week} className="history-row" onClick={() => setNotice(`${week.week} archive fixtures selected`)}><span className="history-date"><b>{week.week}</b><small>{week.date}</small></span><span className="history-results"><b>13 SUNDAY MATCHUPS</b><small>Final scores · all family picks · standings</small></span><span className="history-winner"><Trophy size={15} /><b>{week.winner}</b><small>WEEKLY WINNER · {week.points} PTS</small></span><span className="history-arrow">→</span></button>)}</section>}

        {activeTab === 'league' && <section className="settings-grid"><div className="content-board settings-board"><div className="board-toolbar"><div><span className="board-label">LEAGUE SETTINGS</span><h2>Sunday crew</h2></div><span className="commissioner-tag">COMMISSIONER</span></div><div className="setting-field"><span>LEAGUE NAME</span><b>The Sunday Crew <button aria-label="Edit league name" onClick={() => setNotice('League editing is available after Supabase setup.')}><Settings2 size={14} /></button></b></div><div className="setting-field"><span>SEASON</span><b>2026 Regular Season <ChevronDown size={14} /></b></div><div className="setting-field"><span>LEAGUE TIMEZONE</span><b>America/New_York <ChevronDown size={14} /></b></div><div className="setting-field"><span>SCORING</span><b>Correct pick = 1 point <span className="setting-note">TIE = INCORRECT · MISSING = 0</span></b></div><div className="setting-field"><span>MEMBERS</span><div className="member-list">{members.map((member) => <div key={member.id} className="member-line"><div className="avatar tiny-avatar" style={{ background: member.color }}>{member.initials}</div><b>{member.name}</b><small>{member.id === 'you' ? 'COMMISSIONER' : 'MEMBER'}</small></div>)}</div></div><button className="invite-button" onClick={() => setNotice('Invitation links are enabled after Supabase setup.')}><Users size={15} /> INVITE A FAMILY MEMBER <span>+</span></button></div><aside className="setup-panel"><div className={`setup-mark ${supabaseReady ? 'configured' : ''}`}>{supabaseReady ? <Check size={20} /> : <ShieldCheck size={20} />}</div><span>{supabaseReady ? 'KEYS DETECTED · DEMO ONLY' : 'CONNECTION STATUS'}</span><h3>{supabaseReady ? 'Not connected yet.' : 'Your demo is local-only.'}</h3><p>{supabaseReady ? 'Keys are present, but this UI still uses fixtures and browser storage. Apply the migration and implement auth/data access before inviting family.' : 'Picks are saved in this browser only. Add Supabase project keys when you are ready to wire up shared leagues.'}</p><div className="setup-code">VITE_SUPABASE_URL<br />VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</div><button onClick={() => setNotice('See README.md for Supabase and GitHub Pages setup steps.')}>SETUP IN README <span>→</span></button></aside></section>}
      </main>

      <footer className="footer-strip"><span>© 2026 SUNDAY PICK'EM</span><span>MADE FOR THE SUNDAY CREW <b>•</b> NOT AFFILIATED WITH THE NFL</span><span>WEEK 08 / 18</span></footer>
      {notice && <div className="toast" role="status"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
      {selectedGame && activeTab === 'family' && <div className="selection-note"><Clock3 size={14} /> PICKS ARE VISIBLE TO LEAGUE MEMBERS</div>}
    </div>
  )
}

function TeamBadge({ team, compact = false }: { team: Team; compact?: boolean }) {
  return <span className={`team-badge ${compact ? 'compact' : ''}`} style={{ backgroundColor: team.color }}>{team.mark}</span>
}

function MatchupCard({ game, picked, allPicks, onPick, onFamily }: { game: Game; picked?: string; allPicks: Record<string, Record<string, string>>; onPick: (game: Game, teamId: string) => void; onFamily: () => void }) {
  const pickCount = Object.values(allPicks).filter((memberPicks) => memberPicks[game.id]).length
  return <article className="matchup-card"><div className="game-meta"><span className={`status-chip ${game.status.toLowerCase()}`}><i />{game.status}</span><span className="matchup-time"><Clock3 size={12} /> {game.kickoff} ET</span><button className="family-link" onClick={onFamily}><Users size={13} /> {pickCount}<span> PICKS</span> <span>→</span></button></div><div className="matchup-teams">{[game.away, game.home].map((team, index) => <div key={team.id} className={`team-choice ${picked === team.id ? 'picked' : ''}`}><button className="team-pick" disabled={game.status !== 'UPCOMING'} onClick={() => onPick(game, team.id)} aria-pressed={picked === team.id} aria-label={`Pick ${team.city} ${team.name}`}><TeamBadge team={team} /><span className="team-copy"><b>{team.city}</b><strong>{team.name}</strong></span><span className="team-code">{team.mark}</span><span className="pick-check"><Check size={13} /></span></button>{index === 0 && <div className="versus">AT</div>}</div>)}</div><div className={`pick-footer ${picked ? 'has-pick' : ''}`}>{picked ? <><span className="saved-dot"><Check size={11} /></span><span>YOUR PICK</span><b>{teams[picked]?.mark}</b><span className="saved-label">SAVED</span></> : <><span className="lock-mini"><ShieldCheck size={12} /></span><span>SELECT A WINNER TO SAVE YOUR PICK</span></>}</div></article>
}

function FamilyGame({ game, picks, selected, onPick }: { game: Game; picks: Record<string, Record<string, string>>; selected: boolean; onPick: (game: Game, teamId: string) => void }) {
  const teamPicks = (team: Team) => members.filter((member) => picks[member.id]?.[game.id] === team.id)
  const none = members.filter((member) => !picks[member.id]?.[game.id])
  const myPick = picks.you?.[game.id]
  const awayPickCount = teamPicks(game.away).length
  const homePickCount = teamPicks(game.home).length
  const totalPicks = awayPickCount + homePickCount

  return <article className={`family-game ${selected ? 'family-selected' : ''}`}><div className="family-game-head"><div><span className="board-label">{game.window} WINDOW · {game.kickoff} ET</span><b>{game.away.mark} <i>@</i> {game.home.mark}</b></div><span className="status-chip upcoming"><i />{game.status}</span></div><div className="family-matchup"><div className="family-side"><TeamBadge team={game.away} compact /><b>{game.away.name}</b><span>{awayPickCount} PICK{awayPickCount === 1 ? '' : 'S'}</span><div className="family-avatars">{teamPicks(game.away).map((member) => <span key={member.id} title={member.name} className="avatar family-avatar" style={{ background: member.color }}>{member.initials}</span>)}</div></div><div className="family-share"><span>{Math.round((awayPickCount / Math.max(totalPicks, 1)) * 100)}%</span><div><i style={{ width: `${(awayPickCount / Math.max(totalPicks, 1)) * 100}%` }} /></div><span>{Math.round((homePickCount / Math.max(totalPicks, 1)) * 100)}%</span></div><div className="family-side home-side"><TeamBadge team={game.home} compact /><b>{game.home.name}</b><span>{homePickCount} PICK{homePickCount === 1 ? '' : 'S'}</span><div className="family-avatars">{teamPicks(game.home).map((member) => <span key={member.id} title={member.name} className="avatar family-avatar" style={{ background: member.color }}>{member.initials}</span>)}</div></div></div><div className="family-people">{members.map((member) => { const pickId = picks[member.id]?.[game.id]; const choice = pickId ? teams[pickId] : undefined; return <div className={`person-pick ${member.id === 'you' ? 'self' : ''}`} key={member.id}><div className="avatar tiny-avatar" style={{ background: member.color }}>{member.initials}</div><span>{member.name}</span>{choice ? <b><TeamBadge team={choice} compact /> {choice.mark}</b> : <small>NO PICK</small>}{member.id === 'you' && !myPick && <span className="self-prompt" onClick={() => onPick(game, game.away.id)}>MAKE PICK</span>}</div> })}{none.length === 0 && <span className="family-all-in">EVERYONE HAS A PICK</span>}</div></article>
}

export default App
