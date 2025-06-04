// hooks/use-profile.tsx

import { useState, useEffect, createContext, useContext, type ReactNode, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import {
  databaseService as databases,
  ID,
  Query,
  APPWRITE_DATABASE_ID,
  PROFILES_COLLECTION_ID,
} from "@/lib/appwrite"
import { Permission, Role, Models, AppwriteException } from "appwrite"
import type { Profile as LocalProfileType } from "@/types/profile"

// Extend LocalProfileType with Appwrite-specific document properties and attributes
export interface AppwriteProfile extends LocalProfileType, Models.Document {
  userId: string; // Ensure this attribute exists in your Appwrite 'profiles' collection
}

type ProfileContextType = {
  profile: LocalProfileType
  updateProfile: (profileData: Partial<LocalProfileType>) => Promise<void>
  isLoading: boolean
  error: string | null
}

const defaultProfile: LocalProfileType = {
  name: "",
  title: "",
  company: "", // Ensure this default is consistent if 'company' is required
  email: "",
  phone: "",
  socials: {},
  profilePicture: undefined,
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth() as { user: Models.User<Models.Preferences> | null | undefined }
  const [profile, setProfile] = useState<LocalProfileType>(defaultProfile)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const appwriteUserId = user?.$id

  const loadProfile = useCallback(async () => {
    if (!appwriteUserId) {
      setProfile(defaultProfile)
      setIsLoading(false)
      if (typeof window !== "undefined") {
        const savedProfile = localStorage.getItem("profile");
        if (savedProfile) {
          try {
            setProfile(JSON.parse(savedProfile));
          } catch (e) { console.error("Failed to parse profile from localStorage on logout", e); }
        } else {
          setProfile(defaultProfile);
        }
      }
      return
    }

    setIsLoading(true)
    setError(null)

    const savedProfileKey = `profile_${appwriteUserId}`;
    const savedProfile = localStorage.getItem(savedProfileKey)
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile) as LocalProfileType
        setProfile(parsed)
      } catch (e) {
        console.error("Failed to parse profile from localStorage", e)
        localStorage.removeItem(savedProfileKey)
      }
    }

    try {
      // Fetch document using the PROFILES_COLLECTION_ID from env
      const appwriteDoc = await databases.getDocument<AppwriteProfile>(
        PROFILES_COLLECTION_ID, // Correct collection ID from env/appwrite.ts
        appwriteUserId // Document ID is the user's Appwrite Auth ID
      )
      const loadedProfile: LocalProfileType = {
        name: appwriteDoc.name || user?.name || "",
        email: appwriteDoc.email || user?.email || "",
        title: appwriteDoc.title || "",
        company: appwriteDoc.company || "", // Ensure 'company' is fetched
        phone: appwriteDoc.phone || "",
        socials: appwriteDoc.socials || {},
        profilePicture: appwriteDoc.profilePicture || undefined,
      };
      setProfile(loadedProfile)
      localStorage.setItem(savedProfileKey, JSON.stringify(loadedProfile))
    } catch (e: any) {
      const appwriteError = e as AppwriteException
      // Check for 'collection_not_found' as well
      if (appwriteError.code === 404 || appwriteError.type === "document_not_found" || appwriteError.type === "database_not_found" || appwriteError.type === "collection_not_found") {
        console.log("Appwrite: Profile not found for user. Initializing with defaults.")
        const initialProfile: LocalProfileType = {
          ...defaultProfile,
          name: user?.name || "",
          email: user?.email || "",
          company: defaultProfile.company || "", // Ensure company default is passed
        }
        setProfile(initialProfile)
        localStorage.setItem(savedProfileKey, JSON.stringify(initialProfile))
      } else {
        console.error("Appwrite: Failed to fetch profile", appwriteError)
        setError("Failed to load profile from database.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [appwriteUserId, user?.name, user?.email]) // Dependencies for useCallback

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const updateProfile = async (newProfileData: Partial<LocalProfileType>) => {
    if (!appwriteUserId) {
      setError("User not authenticated. Profile not saved.")
      const updatedLocalProfile = { ...profile, ...newProfileData };
      setProfile(updatedLocalProfile);
      localStorage.setItem("profile", JSON.stringify(updatedLocalProfile));
      return
    }

    setIsLoading(true)
    setError(null)

    // Merge current profile with new data to ensure all required fields are present in payload
    const currentFullProfile = { ...profile, ...newProfileData };
    
    // Construct payload including all required attributes for your Appwrite 'profiles' collection
    // The Omit type should now exclude '$id' and other Appwrite specific document fields
    // Ensure 'userId' (camelCase) is included if that's your attribute name
    const payload: Omit<AppwriteProfile, keyof Models.Document> = {
        name: currentFullProfile.name || "", // Ensure name is not undefined/null if required
        title: currentFullProfile.title || "",
        company: currentFullProfile.company || "", // CRITICAL: Ensure company is ALWAYS included and has a value if required
        email: currentFullProfile.email || "", // Ensure email is not undefined/null if required
        phone: currentFullProfile.phone || "",
        socials: currentFullProfile.socials || {},
        profilePicture: currentFullProfile.profilePicture || undefined,
        userId: appwriteUserId, // IMPORTANT: Match your Appwrite attribute (e.g., 'userId' camelCase)
    };

    const savedProfileKey = `profile_${appwriteUserId}`;

    try {
      // Attempt to update the document first
      const updatedDoc = await databases.updateDocument<AppwriteProfile>(
        PROFILES_COLLECTION_ID, // Use the constant derived from .env
        appwriteUserId,       // Document ID is the user's Appwrite Auth ID
        payload
      )
      const newProfileState: LocalProfileType = {
        name: updatedDoc.name,
        title: updatedDoc.title,
        company: updatedDoc.company,
        email: updatedDoc.email,
        phone: updatedDoc.phone,
        socials: updatedDoc.socials,
        profilePicture: updatedDoc.profilePicture,
      };
      setProfile(newProfileState);
      localStorage.setItem(savedProfileKey, JSON.stringify(newProfileState));
    } catch (e: any) {
      const appwriteError = e as AppwriteException;
      // Handle document not found (404) or other not found errors
      if (appwriteError.code === 404 || appwriteError.type === "document_not_found" || appwriteError.type === "database_not_found" || appwriteError.type === "collection_not_found") {
        console.log("Appwrite: Profile document not found, attempting to create it.");
        try {
          // If document not found, create a new one with the user's ID as its $id
          const createdDoc = await databases.createDocumentWithId<AppwriteProfile>(
            PROFILES_COLLECTION_ID, // Use the constant derived from .env
            appwriteUserId,         // Explicitly provide the user's ID as the document ID
            payload,                // Payload should contain all required attributes
            [
              Permission.read(Role.user(appwriteUserId!)),
              Permission.update(Role.user(appwriteUserId!)),
              Permission.delete(Role.user(appwriteUserId!)),
            ]
          );
          const newProfileState: LocalProfileType = {
            name: createdDoc.name,
            title: createdDoc.title,
            company: createdDoc.company,
            email: createdDoc.email,
            phone: createdDoc.phone,
            socials: createdDoc.socials,
            profilePicture: createdDoc.profilePicture,
          };
          setProfile(newProfileState);
          localStorage.setItem(savedProfileKey, JSON.stringify(newProfileState));
        } catch (createError: any) {
          console.error("Appwrite: Failed to create profile", createError);
          // Check for specific attribute validation errors here if needed
          setError("Failed to save profile to database (creation failed).");
        }
      } else {
        console.error("Appwrite: Failed to update profile", appwriteError);
        setError("Failed to save profile to database (update failed).");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <ProfileContext.Provider value={{ profile, updateProfile, isLoading, error }}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider")
  }
  return context
}