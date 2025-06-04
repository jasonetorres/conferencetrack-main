"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useAppwrite, AuthUser } from '@/hooks/useAppwrite';

// Define the shape of our Auth Context
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<any>;
  register: (email: string, password: string, name: string) => Promise<any>;
  isLoggedIn: boolean;
  sendPasswordRecovery: (email: string) => Promise<any>;
  resetPassword: (userId: string, token: string, password: string, confirmPassword: string) => Promise<any>;
  db: any; // Database service
  storage: any; // Storage service
}

// Create the Auth Context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props for AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Use our custom hook to get all authentication functionality
  const {
    user,
    loading,
    error,
    login,
    logout,
    register,
    isLoggedIn,
    db,
    storage,
    sendPasswordRecovery,
    resetPassword
  } = useAppwrite();

  // Value to be provided to consuming components
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    isLoggedIn,
    db,
    storage,
    sendPasswordRecovery,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthProvider;

