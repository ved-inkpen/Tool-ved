import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/Shared';

const ROUTE_BY_ROLE = {
  admin: '/admin',
  creator: '/creator',
  script_reviewer: '/script-review',
  agency_admin: '/agency',
  video_editor: '/editor',
  final_reviewer: '/final-review',
};

export default function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROUTE_BY_ROLE[user.role] || '/downloads'} replace />;
}
