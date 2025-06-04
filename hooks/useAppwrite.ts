import { useEffect, useState } from 'react';
import { Models } from 'appwrite';
import {
  accountInstance as account, // You might not even need to import accountInstance directly if only authService wraps it
  authService,
  databaseService,
  storageService,
  client 
} from '@/lib/appwrite'; // Assuming '@/lib/appwrite' exports a `client` instance as well

export type AuthUser = Models.User<Models.Preferences>;

interface UseAppwriteReturn {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<any>;
  register: (email: string, password: string, name: string) => Promise<any>;
  isLoggedIn: boolean;
  checkAuthStatus: () => Promise<void>;
  db: typeof databaseService;
  storage: typeof storageService;
  sendPasswordRecovery: (email: string) => Promise<any>;
  resetPassword: (userId: string, token: string, password: string, confirmPassword: string) => Promise<any>;
}

export const useAppwrite = (): UseAppwriteReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Function to check authentication status
  const checkAuthStatus = async (): Promise<void> => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();

      if (currentUser) {
        setUser(currentUser);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }

      setError(null);
    } catch (err) {
      setUser(null);
      setIsLoggedIn(false);
      // It's good practice to check if err is an instance of Error before setting
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();

    // Removed the problematic account.onChange.
    // If you need real-time updates for the account, you would typically use client.subscribe.
    // Example (requires 'client' export from '@/lib/appwrite'):
    /*
    const unsubscribe = client.subscribe('account', (response) => {
      // response.payload would contain the updated account data
      // You might need to re-fetch the full user object if 'response.payload' is not enough
      // or use authService.getCurrentUser() again if you prefer.
      console.log('Appwrite account changed:', response.payload);
      checkAuthStatus(); // Re-check status on account change
    });

    return () => {
      if (unsubscribe) {
        unsubscribe(); // Unsubscribe on unmount
      }
    };
    */
    // For most authentication flows (login, logout, register), calling checkAuthStatus
    // after the operation is sufficient. The dependency array ensures it runs once on mount.
    // The `onChange` from the previous code was likely a misunderstanding of Appwrite's real-time API.
  }, []); // Empty dependency array means this effect runs once on mount

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const session = await authService.login(email, password);
      await checkAuthStatus(); // Re-check status after successful login
      return session;
    } catch (err) {
      // It's good practice to check if err is an instance of Error before setting
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err; // Re-throw the error for the caller to handle
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null); // Clear user state immediately
      setIsLoggedIn(false); // Update login status immediately
      setError(null); // Clear any previous errors
    } catch (err) {
      // It's good practice to check if err is an instance of Error before setting
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const newUser = await authService.createAccount(email, password, name);
      await checkAuthStatus(); // Re-check status after successful registration
      return newUser;
    } catch (err) {
      // It's good practice to check if err is an instance of Error before setting
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Password recovery function
  const sendPasswordRecovery = async (email: string) => {
    setLoading(true);
    try {
      const result = await authService.sendPasswordRecovery(email);
      setError(null); // Clear any previous errors
      return result;
    } catch (err) {
      // It's good practice to check if err is an instance of Error before setting
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (userId: string, token: string, password: string, confirmPassword: string) => {
    setLoading(true);
    try {
      // Assuming authService.resetPassword handles the password and confirmPassword logic
      const result = await authService.resetPassword(userId, token, password, confirmPassword);
      setError(null); // Clear any previous errors
      return result;
    } catch (err) {
      // It's good practice to check if err is an instance of Error before setting
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    register,
    isLoggedIn,
    checkAuthStatus,
    db: databaseService,
    storage: storageService,
    sendPasswordRecovery,
    resetPassword
  };
};

export default useAppwrite;