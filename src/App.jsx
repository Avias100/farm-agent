import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ActivityLoggerPage from './pages/ActivityLogger'
import ScoutingPage       from './pages/Scouting'
import MarketPage         from './pages/Market'
import NurseryPage        from './pages/Nursery'
import StaffPage          from './pages/Staff'
import CrmPage            from './pages/Crm'
import DashboardPage      from './pages/Dashboard'
import WorkplanPage       from './pages/Workplan'

/**
 * App root — React Router v6 (Authentication Disabled)
 *
 * All routes are accessible without login:
 *   /          → ActivityLogger   (Module 1)
 *   /scouting  → ScoutingPage     (Module 2)
 *   /market    → MarketPage       (Module 3)
 *   /nursery   → NurseryPage      (Module 4)
 *   /staff     → StaffPage        (Module 5)
 *   /crm       → CrmPage          (Module 6)
 *   /dashboard → DashboardPage    (Module 7)
 *   /workplan  → WorkplanPage     (Module 8)
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Authentication disabled - login/register routes removed */}

          {/* Protected routes - require authentication */}
          <Route path="/" element={<ProtectedRoute><ActivityLoggerPage /></ProtectedRoute>} />
          <Route path="/scouting" element={<ProtectedRoute><ScoutingPage /></ProtectedRoute>} />
          <Route path="/market" element={<ProtectedRoute><MarketPage /></ProtectedRoute>} />
          <Route path="/nursery" element={<ProtectedRoute><NurseryPage /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute><StaffPage /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute><CrmPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/workplan" element={<ProtectedRoute><WorkplanPage /></ProtectedRoute>} />

          {/* Catch-all: redirect unknown paths to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
