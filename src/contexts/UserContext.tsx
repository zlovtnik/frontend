import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/auth';
import { asUserId } from '../types/ids';

/**
 * UserContext - Separated from AuthContext for better performance
 * Only re-renders components that depend on user data
 */
export interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export { UserContext };

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const value: UserContextType = {
    user,
    setUser,
  };

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
