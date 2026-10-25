import { createHashRouter, Navigate } from 'react-router-dom'
import { App } from './app/App'
import { GameLayout } from './app/GameLayout'
import { CreateCareerScreen } from './ui/screens/CreateCareerScreen'
import { DashboardScreen } from './ui/screens/DashboardScreen'
import { InboxScreen } from './ui/screens/InboxScreen'
import { MatchdayScreen } from './ui/screens/MatchdayScreen'
import { MoreScreen } from './ui/screens/MoreScreen'
import { ProfileScreen } from './ui/screens/ProfileScreen'
import { ScheduleScreen } from './ui/screens/ScheduleScreen'
import { SettingsScreen } from './ui/screens/SettingsScreen'
import { TimelineScreen } from './ui/screens/TimelineScreen'
import { TitleScreen } from './ui/screens/TitleScreen'

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <TitleScreen /> },
      { path: 'create', element: <CreateCareerScreen /> },
      {
        element: <GameLayout />,
        children: [
          { path: 'game', element: <DashboardScreen /> },
          { path: 'match', element: <MatchdayScreen /> },
          { path: 'schedule', element: <ScheduleScreen /> },
          { path: 'inbox', element: <InboxScreen /> },
          { path: 'profile', element: <ProfileScreen /> },
          { path: 'more', element: <MoreScreen /> },
          { path: 'settings', element: <SettingsScreen /> },
          { path: 'timeline', element: <TimelineScreen /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
