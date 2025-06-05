'use client'

import {
	useState,
	useEffect,
	createContext,
	useContext,
	type ReactNode,
	useCallback,
} from 'react'
import { useAppwrite } from '@/hooks/useAppwrite'
import { ID, Query, Permission, Role } from 'appwrite'
import type { Models, AppwriteException } from 'appwrite'
import type { QrSettings as LocalQrSettingsType } from '@/types/qr-settings'

// Ensure these IDs are loaded from environment variables in lib/appwrite.ts
// And ensure they match the actual IDs in your Appwrite console.
const APPWRITE_DATABASE_ID =
	process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'main_db'
const QR_SETTINGS_COLLECTION_ID =
	process.env.NEXT_PUBLIC_QR_SETTINGS_COLLECTION_ID || 'qr_settings'

// Define the Appwrite QR Settings document structure
export interface AppwriteQrSettings
	extends LocalQrSettingsType,
		Models.Document {
	// 'userId' (camelCase) is the required attribute in your Appwrite collection
	// This is separate from the document's $id, which we're setting to appwriteUserId
	userId: string
}

// QR Settings context type definition
type QrSettingsContextType = {
	qrSettings: LocalQrSettingsType
	updateQrSettings: (settings: Partial<LocalQrSettingsType>) => Promise<void>
	isLoading: boolean
	error: string | null // Added error state to context
}

const defaultQrSettings: LocalQrSettingsType = {
	bgColor: '#FFFFFF',
	fgColor: '#000000',
	pageBackgroundColor: '#FFFFFF',
	cardBackgroundColor: '#FFFFFF',
	textColor: '#000000',
	showName: true,
	showTitle: true,
	showCompany: true,
	showContact: true,
	showSocials: true,
	showProfilePicture: true,
	layoutStyle: 'card', // Ensure this type aligns with LocalQrSettingsType
	qrSize: 220,
	borderRadius: 12,
	cardPadding: 24,
	fontFamily: 'Inter',
	fontSize: 14,
}

const QrSettingsContext = createContext<QrSettingsContextType | undefined>(
	undefined
)

export function QrSettingsProvider({ children }: { children: ReactNode }) {
	const { user, db, loading: authLoading } = useAppwrite() // Get user and db instance from useAppwrite
	const [qrSettings, setQrSettings] =
		useState<LocalQrSettingsType>(defaultQrSettings)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const appwriteUserId = user?.$id

	const loadQrSettings = useCallback(async () => {
		if (authLoading) {
			setIsLoading(true) // Keep loading until auth status is resolved
			return
		}
		if (!appwriteUserId) {
			const savedSettings = localStorage.getItem('qrSettings_guest')
			if (savedSettings) {
				try {
					setQrSettings({ ...defaultQrSettings, ...JSON.parse(savedSettings) })
				} catch (e) {
					console.error(
						'Failed to parse QR settings from localStorage (guest)',
						e
					)
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
				console.error('Failed to parse QR settings from localStorage (user)', e)
			}
		}

		// Define a helper function to create settings if they don't exist
		const createQrSettingsDocument = async () => {
			const currentSettings = savedSettings
				? { ...defaultQrSettings, ...JSON.parse(savedSettings) }
				: defaultQrSettings
			
			setQrSettings(currentSettings)
			localStorage.setItem(localStorageKey, JSON.stringify(currentSettings))

			// Prepare payload for QR settings creation
			const payload: Omit<AppwriteQrSettings, keyof Models.Document> = {
				bgColor: currentSettings.bgColor,
				fgColor: currentSettings.fgColor,
				pageBackgroundColor: currentSettings.pageBackgroundColor,
				cardBackgroundColor: currentSettings.cardBackgroundColor,
				textColor: currentSettings.textColor,
				showName: currentSettings.showName,
				showTitle: currentSettings.showTitle,
				showCompany: currentSettings.showCompany,
				showContact: currentSettings.showContact,
				showSocials: currentSettings.showSocials,
				showProfilePicture: currentSettings.showProfilePicture,
				layoutStyle: currentSettings.layoutStyle,
				qrSize: currentSettings.qrSize,
				borderRadius: currentSettings.borderRadius,
				cardPadding: currentSettings.cardPadding,
				fontFamily: currentSettings.fontFamily,
				fontSize: currentSettings.fontSize,
				userId: appwriteUserId, // Using camelCase userId which matches the Appwrite schema
			}

			try {
				// Create document with user's ID as the document ID
				await db.createDocumentWithId<AppwriteQrSettings>(
					QR_SETTINGS_COLLECTION_ID,
					appwriteUserId,
					payload,
					[
						Permission.read(Role.user(appwriteUserId)),
						Permission.update(Role.user(appwriteUserId)),
						Permission.delete(Role.user(appwriteUserId)),
					]
				)
				// No need for console log, this is an expected scenario for new users
			} catch (createError: any) {
				// Only log errors that aren't related to document already existing
				if (createError.code !== 409) { // 409 is conflict/already exists
					console.error(
						'Appwrite: Failed to create initial QR settings',
						createError
					)
					setError('Failed to initialize QR settings in database.')
				}
			}
		}

		try {
			// Check if document exists first, using list instead of get to avoid 404 errors in console
			const documentList = await db.listDocuments<AppwriteQrSettings>(
				QR_SETTINGS_COLLECTION_ID,
				[Query.equal('userId', appwriteUserId), Query.limit(1)]
			)

			if (documentList.documents.length === 0) {
				// No settings found, create them
				await createQrSettingsDocument()
			} else {
				// Document exists, load settings from the first (and only) document
				const document = documentList.documents[0]
				
				// Load all QR settings from the document
				const loadedSettings: LocalQrSettingsType = {
					bgColor: document.bgColor,
					fgColor: document.fgColor,
					pageBackgroundColor: document.pageBackgroundColor,
					cardBackgroundColor: document.cardBackgroundColor,
					textColor: document.textColor,
					showName: document.showName,
					showTitle: document.showTitle,
					showCompany: document.showCompany,
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
			}
		} catch (e: any) {
			// Handle unexpected errors (not 404s which we've already handled)
			console.error('Appwrite: Error loading QR settings', e)
			setError('Failed to load QR settings from database.')
			
			// Fall back to local storage or defaults if we can't fetch from server
			const currentSettings = savedSettings
				? { ...defaultQrSettings, ...JSON.parse(savedSettings) }
				: defaultQrSettings
			setQrSettings(currentSettings)
			
			// Attempt to create the document in case it's a permissions issue or missing collection
			if (e.code === 404) {
				await createQrSettingsDocument()
			}
		} finally {
			setIsLoading(false)
		}
	}, [appwriteUserId, db, authLoading]) // Dependencies updated

	useEffect(() => {
		loadQrSettings()
	}, [loadQrSettings])

	const updateQrSettings = async (
		settingsToUpdate: Partial<LocalQrSettingsType>
	) => {
		const newSettings = { ...qrSettings, ...settingsToUpdate }
		setQrSettings(newSettings) // Optimistic update

		const localStorageKey = appwriteUserId
			? `qrSettings_${appwriteUserId}`
			: 'qrSettings_guest'
		localStorage.setItem(localStorageKey, JSON.stringify(newSettings))

		if (!appwriteUserId || !db) {
			console.warn(
				'User not authenticated or DB not available. QR Settings saved locally only.'
			)
			return // Exit if not authenticated
		}

		setError(null)

		// Ensure all attributes match your Appwrite collection schema for QR settings
		const payload: Omit<AppwriteQrSettings, keyof Models.Document | '$id'> = {
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
			userId: appwriteUserId, // Using camelCase userId which matches the Appwrite schema
		}

		// First check if the document exists using query (avoids potential 404 errors in the console)
		try {
			const documentExists = await db.listDocuments<AppwriteQrSettings>(
				QR_SETTINGS_COLLECTION_ID,
				[Query.equal('userId', appwriteUserId), Query.limit(1)]
			)

			if (documentExists.documents.length === 0) {
				// Document doesn't exist, create it
				await db.createDocumentWithId<AppwriteQrSettings>(
					QR_SETTINGS_COLLECTION_ID,
					appwriteUserId,
					payload,
					[
						Permission.read(Role.user(appwriteUserId)),
						Permission.update(Role.user(appwriteUserId)),
						Permission.delete(Role.user(appwriteUserId)),
					]
				)
			} else {
				// Document exists, update it
				await db.updateDocument<AppwriteQrSettings>(
					QR_SETTINGS_COLLECTION_ID,
					documentExists.documents[0].$id, // Use the document's actual ID
					payload
				)
			}
		} catch (e: any) {
			console.error('Appwrite: Failed to save QR settings', e)
			setError('Failed to save QR settings to database.')
		}
	}

	return (
		<QrSettingsContext.Provider
			value={{ qrSettings, updateQrSettings, isLoading, error }}
		>
			{children}
		</QrSettingsContext.Provider>
	)
}

export function useQrSettings() {
	const context = useContext(QrSettingsContext)
	if (context === undefined) {
		throw new Error('useQrSettings must be used within a QrSettingsProvider')
	}
	return context
}
