import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import UserActivity from './pages/sections/UserActivity'
import ScreenEngagement from './pages/sections/ScreenEngagement'
import FeedActivity from './pages/sections/FeedActivity'
import LibraryAssets from './pages/sections/LibraryAssets'
import TrainingAssets from './pages/sections/TrainingAssets'
import Downloads from './pages/sections/Downloads'
import AIUsage from './pages/sections/AIUsage'
import ChatActivity from './pages/sections/ChatActivity'
import DirectoryUsage from './pages/sections/DirectoryUsage'
import UserReport from './pages/sections/UserReport'
import Notifications from './pages/sections/Notifications'
import GrowthRetention from './pages/sections/GrowthRetention'

export default function AnalyticsApp() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="user-activity" element={<UserActivity />} />
            <Route path="screens" element={<ScreenEngagement />} />
            <Route path="feed" element={<FeedActivity />} />
            <Route path="library" element={<LibraryAssets />} />
            <Route path="training" element={<TrainingAssets />} />
            <Route path="downloads" element={<Downloads />} />
            <Route path="ai-usage" element={<AIUsage />} />
            <Route path="chat" element={<ChatActivity />} />
            <Route path="directory" element={<DirectoryUsage />} />
            <Route path="user-report" element={<UserReport />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="growth" element={<GrowthRetention />} />
          </Route>
          <Route path="*" element={<Navigate to="/manage-analytics" replace />} />
        </Routes>
      </AppProvider>
    </ThemeProvider>
  )
}
