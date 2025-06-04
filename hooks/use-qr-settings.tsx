"use client"

import { useState, useEffect, createContext, useContext, type ReactNode, useCallback } from "react"
import { useAppwrite } from "@/hooks/useAppwrite"
import { ID, Query, Permission, Role } from "appwrite"
import type { Models, AppwriteException } from "appwrite"
import type { QrSettings as LocalQrSettingsType } from "@/types/qr-settings"

// Ensure these IDs are loaded from environment variables in lib/appwrite.ts
// And ensure they match the actual IDs in your Appwrite console.
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "main_db";
const QR_SETTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_QR_SETTINGS_COLLECTION_ID || "qr_settings";

// Define the Appwrite QR Settings document structure
export interface AppwriteQrSettings extends LocalQrSettingsType, Models.Document {
  // Assuming 'user_id' is a required attribute in your Appwrite collection
  // if you want to store the user's ID as a data field within the document.
  // This is separate from the document's $id, which we're setting to appwriteUserId.
  user_id: string;
}

type QrSettingsContextType = {
  qrSettings: LocalQrSettingsType
  updateQrSettings: (settings: Partial<LocalQrSettingsType>) => Promise<void>
  isLoading: boolean
  error: string | null // Added error state to context
}

const defaultQrSettings: LocalQrSettingsType = {
  bgColor: "#FFFFFF",
  fgColor: "#000000",
  pageBackgroundColor: "#FFFFFF",
  cardBackgroundColor: "#FFFFFF",
  textColor: "#000000",
  showName: true,
  showTitle: true,
  showCompany: true,
  showContact: true,
  showSocials: true,
  showProfilePicture: true,
  layoutStyle: "card", // Ensure this type aligns with LocalQrSettingsType
  qrSize: 220,
  borderRadius: 12,
  cardPadding: 24,
  fontFamily: "Inter",
  fontSize: 14,
}

const QrSettingsContext = createContext<QrSettingsContextType | undefined>(undefined)

export function QrSettingsProvider({ children }: { children: ReactNode }) {
  const { user, db, loading: authLoading } = useAppwrite() // Get user and db instance from useAppwrite
  const [qrSettings, setQrSettings] = useState<LocalQrSettingsType>(defaultQrSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const appwriteUserId = user?.$id

  const loadQrSettings = useCallback(async () => {
    if (authLoading) {
        setIsLoading(true); // Keep loading until auth status is resolved
        return;
    }
    if (!appwriteUserId) {
      const savedSettings = localStorage.getItem("qrSettings_guest")
      if (savedSettings) {
        try {
          setQrSettings({ ...defaultQrSettings, ...JSON.parse(savedSettings) })
        } catch (e) {
          console.error("Failed to parse QR settings from localStorage (guest)", e)
          setQrSettings(defaultQrSettings)
        }
      } else {
        setQrSettings(defaultQrSettings)
      }
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const localStorageKey = `qrSettings_${appwriteUserId}`
    const savedSettings = localStorage.getItem(localStorageKey)
    if (savedSettings) {
      try {
        setQrSettings({ ...defaultQrSettings, ...JSON.parse(savedSettings) })
      } catch (e) {
        console.error("Failed to parse QR settings from localStorage (user)", e)
      }
    }

    try {
      // Corrected collection and document ID usage
      const document = await db.getDocument<AppwriteQrSettings>(
        QR_SETTINGS_COLLECTION_ID, // Use the constant derived from .env
        appwriteUserId // Use the user's actual Appwrite ID as the document ID
      )
      const loadedSettings: LocalQrSettingsType = {
        bgColor: document.bgColor,
        fgColor: document.fgColor,
        pageBackgroundColor: document.pageBackgroundColor,
        cardBackgroundColor: document.cardBackgroundColor,
        textColor: document.textColor,
        showName: document.showName,
        showTitle: document.showTitle,
        showCompany: document.company, // Assuming 'company' attribute exists directly on AppwriteQrSettings
        showContact: document.showContact,
        showSocials: document.showSocials,
        showProfilePicture: document.showProfilePicture,
        layoutStyle: document.layoutStyle as any, // Cast if type mismatch
        qrSize: document.qrSize,
        borderRadius: document.borderRadius,
        cardPadding: document.cardPadding,
        fontFamily: document.fontFamily,
        fontSize: document.fontSize,
      }
      setQrSettings(loadedSettings)
      localStorage.setItem(localStorageKey, JSON.stringify(loadedSettings))
    } catch (e: any) {
      const appwriteError = e as AppwriteException
      // Check for 'collection_not_found' in addition to 'document_not_found'
      if (appwriteError.code === 404 || appwriteError.type === "document_not_found" || appwriteError.type === "database_not_found" || appwriteError.type === "collection_not_found") {
        console.log("Appwrite: QR Settings not found for user. Using defaults/local. Will create on first update.")
        const currentSettings = savedSettings ? { ...defaultQrSettings, ...JSON.parse(savedSettings) } : defaultQrSettings;
        setQrSettings(currentSettings);
        localStorage.setItem(localStorageKey, JSON.stringify(currentSettings));
      } else {
        console.error("Appwrite: Failed to fetch QR settings", appwriteError)
        setError("Failed to load QR settings from database.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [appwriteUserId, db, authLoading]) // Added authLoading to dependencies

  useEffect(() => {
    loadQrSettings()
  }, [loadQrSettings])

  const updateQrSettings = async (settingsToUpdate: Partial<LocalQrSettingsType>) => {
    const newSettings = { ...qrSettings, ...settingsToUpdate }
    setQrSettings(newSettings) // Optimistic update

    const localStorageKey = appwriteUserId ? `qrSettings_${appwriteUserId}` : "qrSettings_guest";
    localStorage.setItem(localStorageKey, JSON.stringify(newSettings))

    if (!appwriteUserId || !db) {
      console.warn("User not authenticated or DB not available. QR Settings saved locally only.")
      return; // Exit if not authenticated
    }

    setError(null)

    // Ensure all attributes match your Appwrite collection schema for QR settings
    // Include 'user_id' if it's a required attribute in your Appwrite collection
    const payload: Omit<AppwriteQrSettings, keyof Models.Document | "$id"> = {
      bgColor: newSettings.bgColor,
      fgColor: newSettings.fgColor,
      pageBackgroundColor: newSettings.pageBackgroundColor,
      cardBackgroundColor: newSettings.cardBackgroundColor,
      textColor: newSettings.textColor,
      showName: newSettings.showName,
      showTitle: newSettings.showTitle,
      showCompany: newSettings.showCompany,
      showContact: newSettings.showContact,
      showSocials: newSettings.showSocials,
      showProfilePicture: newSettings.showProfilePicture,
      layoutStyle: newSettings.layoutStyle,
      qrSize: newSettings.qrSize,
      borderRadius: newSettings.borderRadius,
      cardPadding: newSettings.cardPadding,
      fontFamily: newSettings.fontFamily,
      fontSize: newSettings.fontSize,
      user_id: appwriteUserId, // IMPORTANT: Ensure 'user_id' attribute is present in your Appwrite QR settings collection
    };

    try {
      await db.updateDocument<AppwriteQrSettings>(
        QR_SETTINGS_COLLECTION_ID,
        appwriteUserId, // Document ID is user's Appwrite Auth ID
        payload
      )
    } catch (e: any) {
      const appwriteError = e as AppwriteException
      if (appwriteError.code === 404 || appwriteError.type === "document_not_found" || appwriteError.type === "database_not_found" || appwriteError.type === "collection_not_found") {
        try {
          // Use createDocumentWithId because you're providing a specific document ID
          await db.createDocumentWithId<AppwriteQrSettings>( // Changed from createDocument to createDocumentWithId
            QR_SETTINGS_COLLECTION_ID,
            appwriteUserId, // Document ID is user's Appwrite Auth ID
            payload, // Payload already contains user_id
            [
              Permission.read(Role.user(appwriteUserId)),
              Permission.update(Role.user(appwriteUserId)),
              Permission.delete(Role.user(appwriteUserId)),
            ]
          )
        } catch (createError: any) {
          console.error("Appwrite: Failed to create QR settings", createError)
          setError("Failed to save QR settings to database.")
        }
      } else {
        console.error("Appwrite: Failed to update QR settings", appwriteError)
        setError("Failed to save QR settings to database.")
      }
    } finally {
      // You might add specific loading state reset here if needed for updates
    }
  }

  return (
    <QrSettingsContext.Provider value={{ qrSettings, updateQrSettings, isLoading, error }}>
      {children}
    </QrSettingsContext.Provider>
  )
}

export function useQrSettings() {
  const context = useContext(QrSettingsContext)
  if (context === undefined) {
    throw new Error("useQrSettings must be used within a QrSettingsProvider")
  }
  return context
}