import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface AuthUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  fullName: string;
  avatarUrl?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
  };
}
