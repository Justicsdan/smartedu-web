import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import TertiaryProtectedRoute from './components/TertiaryProtectedRoute'
import HomePage from './pages/HomePage'
import LoginMethodPage from './pages/LoginMethodPage'
import RoleSelectionPage from './pages/RoleSelectionPage'
import LoginPage from './pages/LoginPage'
import SchoolCodeLoginPage from './pages/SchoolCodeLoginPage'
import SuperAdminLoginPage from './pages/SuperAdminLoginPage'

const TertiaryLayout = lazy(() => import('./layouts/TertiaryLayout'))
const TertiaryAdminDashboard = lazy(() => import('./pages/tertiary/TertiaryAdminDashboard'))
const TertiaryLecturerDashboard = lazy(() => import('./pages/tertiary/TertiaryLecturerDashboard'))
const TertiaryResultsEntry = lazy(() => import('./pages/tertiary/TertiaryResultsEntry'))
const TertiaryPublishResultsPage = lazy(() => import('./pages/tertiary/TertiaryPublishResultsPage'))
const TertiaryStudentDashboard = lazy(() => import('./pages/tertiary/TertiaryStudentDashboard'))
const TertiaryStudentResultsPage = lazy(() => import('./pages/tertiary/TertiaryStudentResultsPage'))
const TertiaryCoursesPage = lazy(() => import('./pages/tertiary/TertiaryCoursesPage'))
const TertiaryProgrammesPage = lazy(() => import('./pages/tertiary/TertiaryProgrammesPage'))
const TertiaryStudentsPage = lazy(() => import('./pages/tertiary/TertiaryStudentsPage'))
const TertiaryEnrollmentsPage = lazy(() => import('./pages/tertiary/TertiaryEnrollmentsPage'))
const TertiarySettingsPage = lazy(() => import('./pages/tertiary/TertiarySettingsPage'))
const TertiaryLiveLecturesPage = lazy(() => import('./pages/tertiary/TertiaryLiveLecturesPage'))
const TertiaryAnnouncementsPage = lazy(() => import('./pages/tertiary/TertiaryAnnouncementsPage'))
const TertiaryExamsPage = lazy(() => import('./pages/tertiary/TertiaryExamsPage'))
const TertiaryFeesPage = lazy(() => import('./pages/tertiary/TertiaryFeesPage'))
const TertiaryLessonPlansPage = lazy(() => import('./pages/tertiary/TertiaryLessonPlansPage'))

const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const StudentsPage = lazy(() => import('./pages/admin/StudentsPage'))
const TeachersPage = lazy(() => import('./pages/admin/TeachersPage'))
const ClassesPage = lazy(() => import('./pages/admin/ClassesPage'))
const AcademicPage = lazy(() => import('./pages/admin/AcademicPage'))
const ScoresPage = lazy(() => import('./pages/admin/ScoresPage'))
const PublishPage = lazy(() => import('./pages/admin/PublishPage'))
const CbtPage = lazy(() => import('./pages/admin/CbtPage'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const CredentialsPage = lazy(() => import('./pages/admin/CredentialsPage'))
const FeesPage = lazy(() => import('./pages/admin/FeesPage'))
const AnnouncementsPage = lazy(() => import('./pages/admin/AnnouncementsPage'))
const PaceScoresPage = lazy(() => import('./pages/admin/PaceScoresPage'))
const AceReportsPage = lazy(() => import('./pages/admin/AceReportsPage'))
const LiveClassPage = lazy(() => import('./pages/admin/LiveClassPage'))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'))
const AdminLessonPlansPage = lazy(() => import('./pages/admin/AdminLessonPlansPage'))
const AdminAssignmentsPage = lazy(() => import('./pages/admin/AdminAssignmentsPage'))

const StudentLayout = lazy(() => import('./layouts/StudentLayout'))
const TeacherLayout = lazy(() => import('./layouts/TeacherLayout'))
const SuperAdminLayout = lazy(() => import('./layouts/SuperAdminLayout'))

const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'))
const TeacherLessonPlansPage = lazy(() => import('./pages/teacher/TeacherLessonPlansPage'))
const TeacherScores = lazy(() => import('./pages/teacher/TeacherScores'))
const TeacherClasses = lazy(() => import('./pages/teacher/TeacherClasses'))
const TeacherAttendance = lazy(() => import('./pages/teacher/TeacherAttendance'))
const TeacherAssignments = lazy(() => import('./pages/teacher/TeacherAssignments'))
const TeacherCbt = lazy(() => import('./pages/teacher/TeacherCbt'))
const TeacherAnnouncements = lazy(() => import('./pages/teacher/TeacherAnnouncements'))
const TeacherLiveClass = lazy(() => import('./pages/teacher/TeacherLiveClass'))
const TeacherPublish = lazy(() => import('./pages/teacher/TeacherPublish'))
const TeacherMyClass = lazy(() => import('./pages/teacher/TeacherMyClass'))
const TeacherMyStudents = lazy(() => import('./pages/teacher/TeacherMyStudents'))

const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'))
const SuperAdminUsers = lazy(() => import('./pages/superadmin/SuperAdminUsers'))
const SuperAdminAuditLog = lazy(() => import('./pages/superadmin/SuperAdminAuditLog'))
const SchoolsManagement = lazy(() => import('./pages/superadmin/SchoolsManagement'))

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const StudentResultsPage = lazy(() => import('./pages/student/StudentResultsPage'))
const StudentAnnouncementsPage = lazy(() => import('./pages/student/StudentAnnouncementsPage'))
const StudentAttendancePage = lazy(() => import('./pages/student/StudentAttendancePage'))
const StudentFeesPage = lazy(() => import('./pages/student/StudentFeesPage'))
const StudentAssignmentsPage = lazy(() => import('./pages/student/StudentAssignmentsPage'))
const StudentComplaintsPage = lazy(() => import('./pages/student/StudentComplaintsPage'))
const StudentProfilePage = lazy(() => import('./pages/student/StudentProfilePage'))
const StudentCbtPage = lazy(() => import('./pages/student/StudentCbtPage'))
const StudentCbtExamPage = lazy(() => import('./pages/student/StudentCbtExamPage'))
const StudentLiveClassPage = lazy(() => import('./pages/student/StudentLiveClassPage'))

function RouteFallback() {
  return <div className="p-6 text-center text-sm">Loading...</div>
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
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
                <Route path="lesson-plans" element={<AdminLessonPlansPage />} />
                <Route path="assignments" element={<AdminAssignmentsPage />} />
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
                <Route path="lesson-plans" element={<TeacherLessonPlansPage />} />
                <Route path="live-class" element={<TeacherLiveClass />} />
                <Route path="publish" element={<TeacherPublish />} />
              </Route>

              <Route path="/dashboard/tertiary" element={<TertiaryProtectedRoute allowedRoles={['school_admin', 'teacher', 'student']}><TertiaryLayout /></TertiaryProtectedRoute>}>
                <Route path="admin" element={<TertiaryAdminDashboard />} />
                <Route path="admin/courses" element={<TertiaryCoursesPage />} />
                <Route path="admin/programmes" element={<TertiaryProgrammesPage />} />
                <Route path="admin/students" element={<TertiaryStudentsPage />} />
                <Route path="admin/enrollments" element={<TertiaryEnrollmentsPage />} />
                <Route path="admin/results" element={<TertiaryResultsEntry />} />
                <Route path="admin/publish" element={<TertiaryPublishResultsPage />} />
                <Route path="admin/live-lectures" element={<TertiaryLiveLecturesPage />} />
                <Route path="admin/announcements" element={<TertiaryAnnouncementsPage />} />
                <Route path="admin/exams" element={<TertiaryExamsPage />} />
                <Route path="admin/fees" element={<TertiaryFeesPage />} />
                <Route path="admin/lesson-plans" element={<TertiaryLessonPlansPage />} />
                <Route path="admin/settings" element={<TertiarySettingsPage />} />

                <Route path="lecturer" element={<TertiaryLecturerDashboard />} />
                <Route path="lecturer/results" element={<TertiaryResultsEntry />} />
                <Route path="lecturer/live-lectures" element={<TertiaryLiveLecturesPage />} />
                <Route path="lecturer/exams" element={<TertiaryExamsPage />} />
                <Route path="lecturer/lesson-plans" element={<TertiaryLessonPlansPage />} />

                <Route path="student" element={<TertiaryStudentDashboard />} />
                <Route path="student/results" element={<TertiaryStudentResultsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
