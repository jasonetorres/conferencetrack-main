import { authService } from "@/lib/appwrite"; // Import authService instead of accountInstance directly
import type { Models } from "appwrite";

// DEBUG LOG to see if authService is defined when this module loads
console.log("[auth-utils.ts] Imported authService:", authService ? 'OK' : 'Failed/Undefined');

export type AppwriteUser = Models.User<Models.Preferences>;

/**
 * Creates a new user account in Appwrite using authService.
 * authService.createAccount handles creating user, session, and returning the user object.
 * @param email User's email
 * @param password User's password (at least 8 characters)
 * @param name User's name (optional)
 * @returns Promise resolving to the Appwrite user object or null.
 */
export async function createUserInAppwrite(
  email: string,
  password: string,
  name?: string
): Promise<AppwriteUser | null> {
  if (!authService) {
    console.error("[auth-utils.ts] createUserInAppwrite: authService is undefined!");
    throw new Error("Authentication service wrapper is not available.");
  }
  try {
    // authService.createAccount from lib/appwrite.ts should create, login, and return the user model
    const user = await authService.createAccount(email, password, name || ''); // Pass empty string if name is undefined for Appwrite 'create'
    return user;
  } catch (error: any) {
    console.error("Appwrite [auth-utils]: Failed to create user via authService", error);
    // Re-throw the original error message if available, or a generic one
    throw new Error(error.message || "Signup failed. Please try again.");
  }
}

/**
 * Logs in an existing user with email and password using authService.
 * @param email User's email
 * @param password User's password
 * @returns Promise resolving to the Appwrite user object upon successful login.
 */
export async function loginWithAppwrite(
  email: string,
  password: string
): Promise<AppwriteUser | null> { // Changed to return AppwriteUser | null for consistency
  if (!authService) {
    console.error("[auth-utils.ts] loginWithAppwrite: authService is undefined!");
    throw new Error("Authentication service wrapper is not available.");
  }
  try {
    await authService.login(email, password); // authService.login returns a Session
    return await authService.getCurrentUser(); // Fetch user details after session is created
  } catch (error: any) {
    console.error("Appwrite [auth-utils]: Failed to login via authService", error);
    throw new Error(error.message || "Login failed. Invalid email or password.");
  }
}

/**
 * Fetches the currently authenticated Appwrite user using authService.
 * @returns Promise resolving to the Appwrite user object if a session exists, otherwise null.
 */
export async function getCurrentAppwriteUser(): Promise<AppwriteUser | null> {
  if (!authService) {
    console.error("[auth-utils.ts] getCurrentAppwriteUser: authService is undefined!");
    return null;
  }
  try {
    return await authService.getCurrentUser();
  } catch (error) {
    // authService.getCurrentUser already handles returning null on error
    console.error("Appwrite [auth-utils]: Error fetching current user via authService", error);
    return null;
  }
}

/**
 * Logs out the current Appwrite user by deleting the current session using authService.
 * @returns Promise resolving when logout is complete.
 */
export async function logoutFromAppwrite(): Promise<void> {
  if (!authService) {
    console.error("[auth-utils.ts] logoutFromAppwrite: authService is undefined!");
    throw new Error("Authentication service wrapper is not available.");
  }
  try {
    await authService.logout();
  } catch (error: any) {
    console.error("Appwrite [auth-utils]: Failed to logout via authService", error);
    throw error;
  }
}