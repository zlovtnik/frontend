import React, { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/auth';

/**
 * UserContext - Separated from AuthContext for better performance
 * Only re-renders components that depend on user data
 */
export interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const value: UserContextType = useMemo(
    () => ({
      user,
      setUser,
    }),
    [user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.error('useUser called outside UserProvider - component stack:', new Error().stack);
    }
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
