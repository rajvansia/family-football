import { describe, expect, it } from 'vitest'
import { canSubmitPick, isEligibleSundayKickoff, scorePick } from './pickRules'

describe('Sunday kickoff eligibility', () => {
  it('includes a Sunday night game in the league timezone', () => {
    expect(isEligibleSundayKickoff('2026-10-26T00:20:00.000Z', 'America/New_York')).toBe(true)
  })

  it('uses the league timezone rather than the UTC calendar day', () => {
    expect(isEligibleSundayKickoff('2026-10-26T06:30:00.000Z', 'America/New_York')).toBe(false)
    expect(isEligibleSundayKickoff('2026-10-26T06:30:00.000Z', 'America/Los_Angeles')).toBe(true)
  })

  it('handles daylight saving time using the timezone database', () => {
    expect(isEligibleSundayKickoff('2026-03-08T16:00:00.000Z', 'America/New_York')).toBe(true)
    expect(isEligibleSundayKickoff('2026-11-01T16:00:00.000Z', 'America/New_York')).toBe(true)
  })
})

describe('pick deadline and selection', () => {
  const base = {
    kickoffUtc: '2026-10-25T17:00:00.000Z',
    status: 'scheduled' as const,
    homeTeamId: 'home',
    awayTeamId: 'away',
  }

  it('allows a valid selection strictly before kickoff', () => {
    expect(canSubmitPick({ ...base, selectedTeamId: 'home', nowUtc: '2026-10-25T16:59:59.999Z' })).toBe(true)
  })

  it('rejects a pick exactly at kickoff and after kickoff', () => {
    expect(canSubmitPick({ ...base, selectedTeamId: 'home', nowUtc: base.kickoffUtc })).toBe(false)
    expect(canSubmitPick({ ...base, selectedTeamId: 'away', nowUtc: '2026-10-25T17:00:00.001Z' })).toBe(false)
  })

  it('rejects a team not in the matchup and non-scheduled game statuses', () => {
    expect(canSubmitPick({ ...base, selectedTeamId: 'other', nowUtc: '2026-10-25T16:00:00Z' })).toBe(false)
    expect(canSubmitPick({ ...base, status: 'postponed', selectedTeamId: 'home', nowUtc: '2026-10-25T16:00:00Z' })).toBe(false)
  })
})

describe('final pick scoring', () => {
  const final = { status: 'final' as const, homeTeamId: 'home', awayTeamId: 'away', homeScore: 21, awayScore: 17 }

  it('awards one point for the winning team and zero otherwise', () => {
    expect(scorePick({ ...final, selectedTeamId: 'home' })).toBe(1)
    expect(scorePick({ ...final, selectedTeamId: 'away' })).toBe(0)
  })

  it('scores ties and missing picks as incorrect', () => {
    expect(scorePick({ ...final, homeScore: 20, awayScore: 20, selectedTeamId: 'home' })).toBe(0)
    expect(scorePick({ ...final, selectedTeamId: null })).toBe(0)
  })

  it('leaves postponed and canceled games unscored', () => {
    expect(scorePick({ ...final, status: 'postponed', selectedTeamId: 'home' })).toBe(null)
    expect(scorePick({ ...final, status: 'canceled', selectedTeamId: 'home' })).toBe(null)
  })
})
