import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/Shared';
import AppShell from '@/components/AppShell';
import LoginPage from '@/pages/Login';
import HomeRedirect from '@/pages/Home';
import AdminUsersPage from '@/pages/admin/Users';
import AdminAgenciesPage from '@/pages/admin/Agencies';
import CreatorDashboard from '@/pages/creator/Dashboard';
import CreateAdSet from '@/pages/creator/CreateAdSet';
import AdSetDetail from '@/pages/adset/AdSetDetail';
import ScriptReviewQueue from '@/pages/reviewer/Queue';
import ScriptReviewDetail from '@/pages/reviewer/Detail';
import AgencyDashboard from '@/pages/agency/Dashboard';
import AgencyEditors from '@/pages/agency/Editors';
import AgencyAdSetDetail from '@/pages/agency/AdSetDetail';
import EditorDashboard from '@/pages/editor/Dashboard';
import EditorAdDetail from '@/pages/editor/Detail';
import FinalReviewQueue from '@/pages/final/Queue';
import FinalReviewDetail from '@/pages/final/Detail';
import DownloadsPage from '@/pages/downloads/Downloads';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  return (
    <div className="app-root">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Protected><AppShell /></Protected>}>
              <Route path="/" element={<HomeRedirect />} />
              {/* Admin */}
              <Route path="/admin/users" element={<Protected roles={['admin']}><AdminUsersPage /></Protected>} />
              <Route path="/admin/agencies" element={<Protected roles={['admin']}><AdminAgenciesPage /></Protected>} />
              {/* Creator */}
              <Route path="/creator" element={<Protected roles={['creator', 'admin']}><CreatorDashboard /></Protected>} />
              <Route path="/creator/new" element={<Protected roles={['creator', 'admin']}><CreateAdSet /></Protected>} />
              {/* Shared AdSet detail (viewable per role scoping) */}
              <Route path="/ad-sets/:id" element={<AdSetDetail />} />
              {/* Script Reviewer */}
              <Route path="/script-review" element={<Protected roles={['script_reviewer', 'admin']}><ScriptReviewQueue /></Protected>} />
              <Route path="/script-review/:id" element={<Protected roles={['script_reviewer', 'admin']}><ScriptReviewDetail /></Protected>} />
              {/* Agency Admin */}
              <Route path="/agency" element={<Protected roles={['agency_admin', 'admin']}><AgencyDashboard /></Protected>} />
              <Route path="/agency/editors" element={<Protected roles={['agency_admin', 'admin']}><AgencyEditors /></Protected>} />
              <Route path="/agency/ad-sets/:id" element={<Protected roles={['agency_admin', 'admin']}><AgencyAdSetDetail /></Protected>} />
              {/* Editor */}
              <Route path="/editor" element={<Protected roles={['video_editor', 'admin']}><EditorDashboard /></Protected>} />
              <Route path="/editor/ads/:id" element={<Protected roles={['video_editor', 'admin']}><EditorAdDetail /></Protected>} />
              {/* Final Review */}
              <Route path="/final-review" element={<Protected roles={['final_reviewer', 'admin']}><FinalReviewQueue /></Protected>} />
              <Route path="/final-review/ads/:id" element={<Protected roles={['final_reviewer', 'admin']}><FinalReviewDetail /></Protected>} />
              {/* Downloads */}
              <Route path="/downloads" element={<DownloadsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
