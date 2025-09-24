import React from 'react';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Navigate } from 'react-router-dom';
import ClientPortal from './ClientPortal';

const ClientDashboard = () => {
  const { client, loading } = useClientAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return <Navigate to="/client-auth" replace />;
  }

  return <ClientPortal />;
};

export default ClientDashboard;