import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SettingsProvider } from './hooks/useSettings';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider } from './hooks/useAuth';
import PublicLayout from './layouts/PublicLayout';
import Home from './pages/public/Home';
import Tools from './pages/public/Tools';
import ResultPage from './pages/public/ResultPage';

const RandomWheel = lazy(() => import('./features/random-wheel/RandomWheel'));
const TeamMatching = lazy(() => import('./features/team-matching/TeamMatching'));
const GroupGenerator = lazy(() => import('./features/group-generator/GroupGenerator'));
const GroupSpin = lazy(() => import('./features/group-spin/GroupSpin'));
const RandomSelection = lazy(() => import('./features/random-selection/RandomSelection'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const Login = lazy(() => import('./pages/admin/Login'));
const ResetPassword = lazy(() => import('./pages/admin/ResetPassword'));
const Overview = lazy(() => import('./pages/admin/Overview'));
const Activities = lazy(() => import('./pages/admin/Activities'));
const Results = lazy(() => import('./pages/admin/Results'));
const Sessions = lazy(() => import('./pages/admin/Sessions'));
const Exports = lazy(() => import('./pages/admin/Exports'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const SettingsPage = lazy(() => import('./pages/admin/Settings'));
const Backup = lazy(() => import('./pages/admin/Backup'));
const Profile = lazy(() => import('./pages/admin/Profile'));

const Fallback = <div className="mx-auto max-w-6xl p-8"><div className="skeleton h-64" /></div>;

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider><ToastProvider><AuthProvider>
        <Suspense fallback={Fallback}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="tools" element={<Tools />} />
              <Route path="tools/wheel" element={<RandomWheel />} />
              <Route path="tools/teams" element={<TeamMatching />} />
              <Route path="tools/groups" element={<GroupGenerator />} />
              <Route path="tools/group-spin" element={<GroupSpin />} />
              <Route path="tools/select" element={<RandomSelection />} />
              <Route path="result/:id" element={<ResultPage />} />
            </Route>
            <Route path="admin/login" element={<Login />} />
            <Route path="admin/reset" element={<ResetPassword />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Overview />} />
              <Route path="activities" element={<Activities />} />
              <Route path="results" element={<Results />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="exports" element={<Exports />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="backup" element={<Backup />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider></ToastProvider></SettingsProvider>
    </BrowserRouter>
  );
}
