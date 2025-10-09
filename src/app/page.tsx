'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_SECRET_KEY } from '@/lib/constants';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check URL parameters for admin access
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const adminParam = urlParams.get('admin');
      const keyParam = urlParams.get('key');
      
      if (adminParam === 'true' && keyParam === ADMIN_SECRET_KEY) {
        setIsAdmin(true);
      }
    }
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
        <div className="text-center text-white p-8">
          <h1 className="text-2xl font-bold mb-4">Welcome to Telegram Mini App</h1>
          <p className="text-lg opacity-90">Please open this app through Telegram</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <UserDashboard user={user} />
      )}
    </div>
  );
}