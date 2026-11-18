import TertiaryLayout from './layouts/TertiaryLayout'
import TertiaryProtectedRoute from './components/TertiaryProtectedRoute'
import TertiaryAdminDashboard from './pages/tertiary/TertiaryAdminDashboard'
import TertiaryResultsEntry from './pages/tertiary/TertiaryResultsEntry'
import TertiaryStudentDashboard from './pages/tertiary/TertiaryStudentDashboard'
import TertiaryCoursesPage from './pages/tertiary/TertiaryCoursesPage'
import TertiaryStudentsPage from './pages/tertiary/TertiaryStudentsPage'
import TertiaryEnrollmentsPage from './pages/tertiary/TertiaryEnrollmentsPage'
import TertiarySettingsPage from './pages/tertiary/TertiarySettingsPage'
import TertiaryLiveLecturesPage from './pages/tertiary/TertiaryLiveLecturesPage'
import TertiaryAnnouncementsPage from './pages/tertiary/TertiaryAnnouncementsPage'
import TertiaryExamsPage from './pages/tertiary/TertiaryExamsPage'
import TertiaryFeesPage from './pages/tertiary/TertiaryFeesPage'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
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
import TeacherLayout from './layouts/TeacherLayout'
import SuperAdminLayout from './layouts/SuperAdminLayout'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import SuperAdminUsers from './pages/superadmin/SuperAdminUsers'
import SuperAdminAuditLog from './pages/superadmin/SuperAdminAuditLog'
import SchoolsManagement from './pages/superadmin/SchoolsManagement'
import TeacherScores from './pages/teacher/TeacherScores'
import TeacherClasses from './pages/teacher/TeacherClasses'
import TeacherAttendance from './pages/teacher/TeacherAttendance'
import TeacherAssignments from './pages/teacher/TeacherAssignments'
import TeacherCbt from './pages/teacher/TeacherCbt'
import TeacherAnnouncements from './pages/teacher/TeacherAnnouncements'
import TeacherLiveClass from './pages/teacher/TeacherLiveClass'
import TeacherPublish from './pages/teacher/TeacherPublish'
import TeacherMyClass from './pages/teacher/TeacherMyClass'
import TeacherMyStudents from './pages/teacher/TeacherMyStudents'
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

        <Route path="/dashboard/schooladmin" element={<ProtectedRoute allowedRoles={['school_admin', 'super_admin']}><AdminLayout /></ProtectedRoute>}>
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

        <Route path="/dashboard/student" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout /></ProtectedRoute>}>
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

        <Route path="/dashboard/superadmin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminLayout /></ProtectedRoute>}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="schools" element={<SchoolsManagement />} />
          <Route path="users" element={<SuperAdminUsers />} />
          <Route path="audit-log" element={<SuperAdminAuditLog />} />
        </Route>

              <Route path="/dashboard/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherLayout /></ProtectedRoute>}>
          <Route index element={<TeacherDashboard />} />
          <Route path="my-class" element={<TeacherMyClass />} />
          <Route path="my-students" element={<TeacherMyStudents />} />
          <Route path="my-classes" element={<TeacherClasses />} />
          <Route path="scores" element={<TeacherScores />} />
          <Route path="assignments" element={<TeacherAssignments />} />
          <Route path="cbt" element={<TeacherCbt />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="results" element={<TeacherDashboard />} />
          <Route path="announcements" element={<TeacherAnnouncements />} />
          <Route path="live-class" element={<TeacherLiveClass />} />
          <Route path="publish" element={<TeacherPublish />} />
        </Route>
      
        <Route path="/dashboard/tertiary" element={<TertiaryProtectedRoute allowedRoles={['school_admin', 'student']}><TertiaryLayout /></TertiaryProtectedRoute>}>
          <Route path="admin" element={<TertiaryAdminDashboard />} />
          <Route path="admin/courses" element={<TertiaryCoursesPage />} />
          <Route path="admin/students" element={<TertiaryStudentsPage />} />
          <Route path="admin/enrollments" element={<TertiaryEnrollmentsPage />} />
          <Route path="admin/results" element={<TertiaryResultsEntry />} />
          <Route path="admin/live-lectures" element={<TertiaryLiveLecturesPage />} />
          <Route path="admin/announcements" element={<TertiaryAnnouncementsPage />} />
          <Route path="admin/exams" element={<TertiaryExamsPage />} />
          <Route path="admin/fees" element={<TertiaryFeesPage />} />
          <Route path="admin/settings" element={<TertiarySettingsPage />} />
          <Route path="student" element={<TertiaryStudentDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
