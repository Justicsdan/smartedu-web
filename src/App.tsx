import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import LoginMethodPage from './pages/LoginMethodPage'
import RoleSelectionPage from './pages/RoleSelectionPage'
import LoginPage from './pages/LoginPage'
import SchoolCodeLoginPage from './pages/SchoolCodeLoginPage'
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
import LiveClassPage from './pages/admin/LiveClassPage'
import ReportsPage from './pages/admin/ReportsPage'
import StudentLayout from './layouts/StudentLayout'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentResultsPage from './pages/student/StudentResultsPage'
import StudentAnnouncementsPage from './pages/student/StudentAnnouncementsPage'
import StudentAttendancePage from './pages/student/StudentAttendancePage'
import StudentFeesPage from './pages/student/StudentFeesPage'
import StudentAssignmentsPage from './pages/student/StudentAssignmentsPage'
import StudentComplaintsPage from './pages/student/StudentComplaintsPage'
import StudentProfilePage from './pages/student/StudentProfilePage'
import StudentCbtPage from './pages/student/StudentCbtPage'
import StudentCbtExamPage from './pages/student/StudentCbtExamPage'
import StudentLiveClassPage from './pages/student/StudentLiveClassPage'

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login-method" element={<LoginMethodPage />} />
        <Route path="/role-selection" element={<RoleSelectionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/s/:code" element={<SchoolCodeLoginPage />} />
        <Route path="/super-admin-login" element={<SuperAdminLoginPage />} />

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
          <Route path="reports" element={<ReportsPage />} />
          <Route path="live-class" element={<LiveClassPage />} />
        </Route>

        <Route path="/dashboard/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="results" element={<StudentResultsPage />} />
          <Route path="assignments" element={<StudentAssignmentsPage />} />
          <Route path="cbt" element={<StudentCbtPage />} />
          <Route path="cbt/exam/:examId" element={<StudentCbtExamPage />} />
          <Route path="announcements" element={<StudentAnnouncementsPage />} />
          <Route path="attendance" element={<StudentAttendancePage />} />
          <Route path="fees" element={<StudentFeesPage />} />
          <Route path="complaints" element={<StudentComplaintsPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
          <Route path="live-class" element={<StudentLiveClassPage />} />
        </Route>

        <Route path="/dashboard/superadmin" element={<div className="p-8">Super Admin Dashboard coming soon...</div>} />
        <Route path="/dashboard/teacher" element={<div className="p-8">Teacher Dashboard coming soon...</div>} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
