'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_SECRET_KEY } from '@/lib/constants';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';

export default function Home() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check URL parameters for admin access
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const adminParam = urlParams.get('admin');
      const keyParam = urlParams.get('key');
      
      // Admin mode check
      if (adminParam === 'true' && keyParam === ADMIN_SECRET_KEY) {
        setIsAdmin(true);
      }
    }
  }, []);

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