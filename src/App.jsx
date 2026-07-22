import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import SplashScreen from '@/components/SplashScreen';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';

const pageImports = [
  ['Dashboard', () => import('@/pages/Dashboard')],
  ['Classes', () => import('@/pages/Classes')],
  ['Teachers', () => import('@/pages/Teachers')],
  ['Subjects', () => import('@/pages/Subjects')],
  ['Students', () => import('@/pages/Students')],
  ['Grades', () => import('@/pages/Grades')],
  ['Attendance', () => import('@/pages/Attendance')],
  ['Calendar', () => import('@/pages/Calendar')],
  ['Schedule', () => import('@/pages/Schedule')],
  ['WeeklyAbsence', () => import('@/pages/WeeklyAbsence')],
  ['AbsenceImpact', () => import('@/pages/AbsenceImpact')],
  ['StudentProfile', () => import('@/pages/StudentProfile')],
  ['Actions', () => import('@/pages/Actions')],
  ['Archives', () => import('@/pages/Archives')],
  ['Backups', () => import('@/pages/Backups')],
  ['Analytics', () => import('@/pages/Analytics')],
  ['StudentTracking', () => import('@/pages/StudentTracking')],
  ['StudentAchievements', () => import('@/pages/StudentAchievements')],
  ['Reports', () => import('@/pages/Reports')],
  ['MonthlyPerformance', () => import('@/pages/MonthlyPerformance')],
  ['PrincipalDashboard', () => import('@/pages/PrincipalDashboard')],
  ['Settings', () => import('@/pages/Settings')],
  ['PrivacyPolicy', () => import('@/pages/PrivacyPolicy')],
  ['TermsOfService', () => import('@/pages/TermsOfService')],
  ['Subscription', () => import('@/pages/Subscription')],
  ['Admin', () => import('@/pages/Admin')],
  ['AdminDashboard', () => import('@/pages/AdminDashboard')],
  ['SchoolLinkManagement', () => import('@/pages/SchoolLinkManagement')],
  ['DiscountCodes', () => import('@/pages/DiscountCodes')],
  ['Notes', () => import('@/pages/Notes')],
  ['TeacherDetail', () => import('@/pages/TeacherDetail')],
  ['StudentOverview', () => import('@/pages/StudentOverview')],
  ['SubjectClassComparison', () => import('@/pages/SubjectClassComparison')],
  ['SchoolTeachers', () => import('@/pages/SchoolTeachers')],
  ['SubjectClassAnalysis', () => import('@/pages/SubjectClassAnalysis')],
  ['StudentClassification', () => import('@/pages/StudentClassification')],
  ['RemedialPlans', () => import('@/pages/RemedialPlans')],
  ['TeacherNeeds', () => import('@/pages/TeacherNeeds')],
  ['TeacherTests', () => import('@/pages/TeacherTests')],
  ['TeacherReports', () => import('@/pages/TeacherReports')],
  ['VarkDashboard', () => import('@/pages/VarkDashboard')],
  ['VarkLearning', () => import('@/pages/VarkLearning')],
  ['VarkStats', () => import('@/pages/VarkStats')],
  ['Certificates', () => import('@/pages/Certificates')],
];

const lazyRetry = (loader) =>
  lazy(async () => {
    let lastErr;
    for (let i = 0; i < 3; i++) {
      try {
        return await loader();
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    throw lastErr;
  });

const lazyPages = Object.fromEntries(pageImports.map(([k, loader]) => [k, lazyRetry(loader)]));
const { Dashboard, Classes, Teachers, Subjects, Students, Grades, Attendance, Calendar, Schedule, WeeklyAbsence, AbsenceImpact, StudentProfile, Actions, Archives, Backups, Analytics, StudentTracking, StudentAchievements, Reports, MonthlyPerformance, PrincipalDashboard, Settings, PrivacyPolicy, TermsOfService, Subscription, Admin, AdminDashboard, DiscountCodes, Notes, TeacherDetail, StudentOverview, SubjectClassComparison, SchoolTeachers, SubjectClassAnalysis, StudentClassification, RemedialPlans, TeacherNeeds, TeacherTests, TeacherReports, SchoolLinkManagement, VarkDashboard, VarkLearning, VarkStats, Certificates } = lazyPages;

// Prefetch all page chunks during idle time so navigation is instant
if (typeof window !== 'undefined') {
  const prefetchPages = () => pageImports.forEach(([, loader]) => loader().catch(() => {}));
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(prefetchPages, { timeout: 2500 });
  } else {
    window.setTimeout(prefetchPages, 1500);
  }
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <SplashScreen />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<SplashScreen />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/students" element={<Students />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/student-tracking" element={<StudentTracking />} />
            <Route path="/student-achievements" element={<StudentAchievements />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/monthly-performance" element={<MonthlyPerformance />} />
            <Route path="/principal" element={<PrincipalDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<Admin />} />
            <Route path="/admin/school-links" element={<SchoolLinkManagement />} />
            <Route path="/discount-codes" element={<DiscountCodes />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/teacher-detail" element={<TeacherDetail />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/weekly-absence" element={<WeeklyAbsence />} />
            <Route path="/absence-impact" element={<AbsenceImpact />} />
            <Route path="/student-profile" element={<StudentProfile />} />
            <Route path="/student-overview" element={<StudentOverview />} />
            <Route path="/subject-class-comparison" element={<SubjectClassComparison />} />
            <Route path="/school-teachers" element={<SchoolTeachers />} />
            <Route path="/subject-class-analysis" element={<SubjectClassAnalysis />} />
            <Route path="/student-classification" element={<StudentClassification />} />
            <Route path="/remedial-plans" element={<RemedialPlans />} />
            <Route path="/teacher-needs" element={<TeacherNeeds />} />
            <Route path="/teacher-tests" element={<TeacherTests />} />
            <Route path="/teacher-reports" element={<TeacherReports />} />
            <Route path="/vark" element={<VarkDashboard />} />
            <Route path="/vark/:token" element={<VarkLearning />} />
            <Route path="/vark-stats/:id" element={<VarkStats />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/actions" element={<Actions />} />
            <Route path="/archives" element={<Archives />} />
            <Route path="/backups" element={<Backups />} />
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App