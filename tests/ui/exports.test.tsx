import { describe, expect, it } from 'vitest'
import {
  BottomNav,
  CreateCareerScreen,
  DashboardScreen,
  InboxScreen,
  MatchdayScreen,
  MoreScreen,
  MovesScreen,
  MoveDetailScreen,
  ProfileScreen,
  ScheduleScreen,
  SeasonSummaryModal,
  SettingsScreen,
  TeamScreen,
  TimelineScreen,
  TitleScreen,
  Toast,
} from '../../src/ui'

describe('ui public entry', () => {
  it('exports all screens', () => {
    for (const screen of [
      CreateCareerScreen,
      DashboardScreen,
      InboxScreen,
      MatchdayScreen,
      MoreScreen,
      MovesScreen,
      MoveDetailScreen,
      ProfileScreen,
      ScheduleScreen,
      SettingsScreen,
      TeamScreen,
      TimelineScreen,
      TitleScreen,
    ]) {
      expect(typeof screen).toBe('function')
    }
  })

  it('exports shared chrome components', () => {
    expect(typeof Toast).toBe('function')
    expect(typeof BottomNav).toBe('function')
    expect(typeof SeasonSummaryModal).toBe('function')
  })
})
