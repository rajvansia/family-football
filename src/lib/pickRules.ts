export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled'

export function isEligibleSundayKickoff(kickoffUtc: string, timeZone: string): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date(kickoffUtc))
  return weekday === 'Sun'
}

export function canSubmitPick(input: {
  kickoffUtc: string
  nowUtc: string
  status: GameStatus
  selectedTeamId: string
  homeTeamId: string
  awayTeamId: string
}): boolean {
  const kickoff = Date.parse(input.kickoffUtc)
  const now = Date.parse(input.nowUtc)
  return input.status === 'scheduled'
    && Number.isFinite(kickoff)
    && Number.isFinite(now)
    && now < kickoff
    && (input.selectedTeamId === input.homeTeamId || input.selectedTeamId === input.awayTeamId)
}

export function scorePick(input: {
  selectedTeamId: string | null
  homeTeamId: string
  awayTeamId: string
  homeScore: number | null
  awayScore: number | null
  status: GameStatus
}): 0 | 1 | null {
  if (input.status === 'canceled' || input.status === 'postponed' || input.status !== 'final') return null
  if (input.homeScore === null || input.awayScore === null || input.homeScore === input.awayScore || input.selectedTeamId === null) return 0
  const winner = input.homeScore > input.awayScore ? input.homeTeamId : input.awayTeamId
  return input.selectedTeamId === winner ? 1 : 0
}
