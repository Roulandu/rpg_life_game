import { createHashRouter, Navigate } from 'react-router-dom'
import { App } from './app/App'
import { GameLayout } from './app/GameLayout'
import { CreateCareerScreen } from './ui'
import { DashboardScreen } from './ui'
import { InboxScreen } from './ui'
import { MatchdayScreen } from './ui'
import { MoreScreen } from './ui'
import { ProfileScreen } from './ui'
import { ScheduleScreen } from './ui'
import { SettingsScreen } from './ui'
import { TimelineScreen } from './ui'
import { TitleScreen } from './ui'

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
