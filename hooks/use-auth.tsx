"use client"

import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react"
import {
  getCurrentAppwriteUser,
  loginWithAppwrite,
  logoutFromAppwrite,
  createUserInAppwrite, // Assuming you'll want a signup function
  type AppwriteUser, // The User type from your Appwrite-based auth-utils
} from "@/lib/auth-utils" // Ensure this path points to your refactored auth-utils.ts

interface AuthContextType {
  user: AppwriteUser | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void> // Added signup
  logout: () => Promise<void>
  isLoading: boolean
  authError: string | null // To store any authentication errors
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppwriteUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Check for existing Appwrite session on mount
  const checkUserSession = useCallback(async () => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const sessionUser = await getCurrentAppwriteUser()
      setUser(sessionUser)
    } catch (error: any) {
      // getCurrentAppwriteUser already handles "no session" by returning null
      // This catch is for other unexpected errors during the check.
      console.error("Error checking user session:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkUserSession()
  }, [checkUserSession])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const appwriteUser = await loginWithAppwrite(email, password)
      setUser(appwriteUser)
    } catch (error: any) {
      console.error("Login failed:", error)
      setUser(null)
      setAuthError(error.message || "Failed to login.")
      throw error // Re-throw to allow component-level error handling
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, name?: string) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      // createUserInAppwrite from your auth-utils should handle account.create
      // and then account.createEmailSession to log the user in, then account.get
      const appwriteUser = await createUserInAppwrite(email, password, name)
      setUser(appwriteUser)
    } catch (error: any) {
      console.error("Signup failed:", error)
      setUser(null)
      setAuthError(error.message || "Failed to create account.")
      throw error // Re-throw
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    setAuthError(null)
    try {
      await logoutFromAppwrite()
      setUser(null)
    } catch (error: any) {
      console.error("Logout failed:", error)
      // Even if server logout fails, clear local user state
      setUser(null)
      setAuthError(error.message || "Failed to logout.")
      // Decide if you need to re-throw
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading, authError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}