import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import RoleSelectionPage from './pages/RoleSelectionPage'
import LoginPage from './pages/LoginPage'
import SuperAdminLoginPage from './pages/SuperAdminLoginPage'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import StudentsPage from './pages/admin/StudentsPage'
import TeachersPage from './pages/admin/TeachersPage'
import ClassesPage from './pages/admin/ClassesPage'
import AcademicPage from './pages/admin/AcademicPage'
import ScoresPage from './pages/admin/ScoresPage'
import PublishPage from './pages/admin/PublishPage'
import CbtPage from './pages/admin/CbtPage'
import SettingsPage from './pages/admin/SettingsPage'
import CredentialsPage from './pages/admin/CredentialsPage'
import FeesPage from './pages/admin/FeesPage'
import AnnouncementsPage from './pages/admin/AnnouncementsPage'
import PaceScoresPage from './pages/admin/PaceScoresPage'
import AceReportsPage from './pages/admin/AceReportsPage'

function App() {
  return (
    <AuthProvider><BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/role-selection" element={<RoleSelectionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/s/:code" element={<div className="p-8">School code login coming soon...</div>} />
        <Route path="/super-admin-login" element={<SuperAdminLoginPage />} />

        {/* Admin routes (nested layout) */}
        <Route path="/dashboard/schooladmin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="academic" element={<AcademicPage />} />
          <Route path="scores" element={<ScoresPage />} />
          <Route path="cbt" element={<CbtPage />} />
          <Route path="publish" element={<PublishPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="credentials" element={<CredentialsPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="pace-scores" element={<PaceScoresPage />} />
          <Route path="ace-reports" element={<AceReportsPage />} />
          <Route path="reports" element={<div className="p-8 text-2xl text-gray-500">Reports page coming soon...</div>} />
          <Route path="live-class" element={<div className="p-8 text-2xl text-gray-500">Live Class page coming soon...</div>} />
        </Route>

        {/* Other dashboards (placeholders) */}
        <Route path="/dashboard/superadmin" element={<div className="p-8">Super Admin Dashboard coming soon...</div>} />
        <Route path="/dashboard/teacher" element={<div className="p-8">Teacher Dashboard coming soon...</div>} />
        <Route path="/dashboard/student" element={<div className="p-8">Student Dashboard coming soon...</div>} />
      </Routes>
    </BrowserRouter></AuthProvider>
  )
}

export default App
