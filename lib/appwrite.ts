import {
	Client,
	Account,
	Databases,
	ID,
	Query,
	Storage,
	Teams,
	Models,
	type ImageFormat,
} from 'appwrite'

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const devKey = process.env.NEXT_PUBLIC_APPWRITE_DEV_KEY // Keep this line for local dev only if you re-enable the dev key method

if (!endpoint || !projectId) {
	console.error(
		'[lib/appwrite.ts] Appwrite endpoint or project ID is critically missing from environment variables!'
	)
	throw new Error(
		'Appwrite endpoint or project ID is missing from environment variables!'
	)
}

let client: Client

// Initialize the client
client = new Client().setEndpoint(endpoint).setProject(projectId)

// Create and export direct SDK service instances
export const accountInstance = new Account(client)
export const databasesInstance = new Databases(client)
export const storageInstance = new Storage(client)
export const teamsInstance = new Teams(client)
export { ID, Query }

// Define database and collection IDs - ENSURE THESE PULL FROM ENV VARS NOW
export const APPWRITE_DATABASE_ID =
	process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'main_db'
export const PROFILES_COLLECTION_ID =
	process.env.NEXT_PUBLIC_PROFILES_COLLECTION_ID || 'profiles'
export const CONTACTS_COLLECTION_ID =
	process.env.NEXT_PUBLIC_CONTACTS_COLLECTION_ID || 'contacts'
export const QR_SETTINGS_COLLECTION_ID =
	process.env.NEXT_PUBLIC_QR_SETTINGS_COLLECTION_ID || 'qr_settings'

// Ensure these constants also pull from new env variables or match exactly from console
export const SPEAKERS_COLLECTION_ID =
	process.env.NEXT_PUBLIC_SPEAKERS_COLLECTION_ID || 'speakers'
export const SESSIONS_COLLECTION_ID =
	process.env.NEXT_PUBLIC_SESSIONS_COLLECTION_ID || 'sessions'
export const ATTENDEES_COLLECTION_ID =
	process.env.NEXT_PUBLIC_ATTENDEES_COLLECTION_ID || 'attendees'
export const CONFERENCES_COLLECTION_ID =
	process.env.NEXT_PUBLIC_CONFERENCES_COLLECTION_ID || 'conferences'

// NEW COLLECTIONS BASED ON YOUR LIST - Make sure you actually use these in your app!
export const SPEAKER_DETAILS_COLLECTION_ID =
	process.env.NEXT_PUBLIC_SPEAKER_DETAILS_COLLECTION_ID || 'speaker_details'
export const CONTACT_DETAILS_COLLECTION_ID =
	process.env.NEXT_PUBLIC_CONTACT_DETAILS_COLLECTION_ID || 'contact_details'
export const CONFERENCE_DETAILS_COLLECTION_ID =
	process.env.NEXT_PUBLIC_CONFERENCE_DETAILS_COLLECTION_ID ||
	'conference_details'
export const PROFILE_SETTINGS_COLLECTION_ID =
	process.env.NEXT_PUBLIC_PROFILE_SETTINGS_COLLECTION_ID || 'profile_settings'

// Storage bucket IDs - ensure these match your Appwrite project setup
export const PROFILE_IMAGES_BUCKET_ID =
	process.env.NEXT_PUBLIC_PROFILE_IMAGES_BUCKET_ID || 'profile_images'
export const CONFERENCE_IMAGES_BUCKET_ID =
	process.env.NEXT_PUBLIC_CONFERENCE_IMAGES_BUCKET_ID || 'conference_images'

// Auth Service Functions Wrapper
export const authService = {
	async createAccount(
		email: string,
		password: string,
		name?: string
	): Promise<Models.User<Models.Preferences> | null> {
		try {
			// Step 1: Create the account
			const newUserAccount = await accountInstance.create(
				ID.unique(),
				email,
				password,
				name
			)

			if (newUserAccount) {
				// Step 2: Create a session for the newly created user
				await accountInstance.createEmailPasswordSession(email, password)

				// Step 3: Return the user details
				return await this.getCurrentUser()
			}
			return null
		} catch (error) {
			console.error('Appwrite service :: createAccount :: error', error)
			throw error
		}
	},

	async login(email: string, password: string): Promise<Models.Session> {
		try {
			return await accountInstance.createEmailPasswordSession(email, password)
		} catch (error) {
			console.error('Appwrite service :: login :: error', error)
			throw error
		}
	},

	async logout(): Promise<void> {
		try {
			// Clear any localStorage cached profile data before logging out
			// This helps prevent stale data from persisting between sessions
			if (typeof window !== 'undefined') {
				// Get user ID before logout to clear user-specific cached data
				const currentUser = await this.getCurrentUser()
				if (currentUser?.$id) {
					const userProfileKey = `profile_${currentUser.$id}`
					localStorage.removeItem(userProfileKey)
				}

				// Remove any generic profile data
				localStorage.removeItem('profile')
			}

			await accountInstance.deleteSession('current')
		} catch (error) {
			console.error('Appwrite service :: logout :: error', error)
			throw error
		}
	},

	async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
		try {
			return await accountInstance.get()
		} catch (error) {
			return null
		}
	},

	async isLoggedIn(): Promise<boolean> {
		try {
			const user = await this.getCurrentUser()
			return !!user
		} catch (error) {
			return false
		}
	},

	async sendPasswordRecovery(email: string): Promise<Models.Token> {
		try {
			const resetURL = `${window.location.origin}/auth/reset-password`
			return await accountInstance.createRecovery(email, resetURL)
		} catch (error) {
			console.error('Appwrite service :: sendPasswordRecovery :: error', error)
			throw error
		}
	},

	async resetPassword(
		userId: string,
		secret: string,
		password: string
	): Promise<Models.Token> {
		try {
			return await accountInstance.updateRecovery(userId, secret, password)
		} catch (error) {
			console.error('Appwrite service :: resetPassword :: error', error)
			throw error
		}
	},
}

// Database Service Functions Wrapper (with Generics)
export const databaseService = {
	async createDocument<T extends Models.Document>(
		collectionId: string,
		data: Record<string, any>,
		permissions?: string[]
	): Promise<T> {
		try {
			return await databasesInstance.createDocument<T>(
				APPWRITE_DATABASE_ID,
				collectionId,
				ID.unique(),
				data as Omit<T, keyof Models.Document>,
				permissions
			)
		} catch (error) {
			console.error(
				`Appwrite service :: createDocument :: error for ${collectionId}`,
				error
			)
			throw error
		}
	},
	async createDocumentWithId<T extends Models.Document>(
		collectionId: string,
		documentId: string,
		data: Record<string, any>,
		permissions?: string[]
	): Promise<T> {
		try {
			return await databasesInstance.createDocument<T>(
				APPWRITE_DATABASE_ID,
				collectionId,
				documentId,
				data as Omit<T, keyof Models.Document>,
				permissions
			)
		} catch (error) {
			console.error(
				`Appwrite service :: createDocumentWithId :: error for ${collectionId}/${documentId}`,
				error
			)
			throw error
		}
	},
	async getDocument<T extends Models.Document>(
		collectionId: string,
		documentId: string,
		suppressNotFoundLogging = false
	): Promise<T> {
		try {
			return await databasesInstance.getDocument<T>(
				APPWRITE_DATABASE_ID,
				collectionId,
				documentId
			)
		} catch (error: any) {
			// Don't log 404 errors if suppressNotFoundLogging is true
			// This prevents console spam for expected "document not found" cases
			const shouldLog = !(
				suppressNotFoundLogging &&
				(error.code === 404 || error.type === 'document_not_found')
			)

			if (shouldLog) {
				console.error(
					`Appwrite service :: getDocument :: error for ${collectionId}/${documentId}`,
					error
				)
			}
			throw error
		}
	},

	// Helper method to check if a document exists without causing 404 console errors
	async documentExists(
		collectionId: string,
		documentId: string
	): Promise<boolean> {
		try {
			// Use listDocuments with a filter to check if the document exists
			// This approach avoids the 404 console error from getDocument
			const result = await databasesInstance.listDocuments(
				APPWRITE_DATABASE_ID,
				collectionId,
				[Query.equal('$id', documentId), Query.limit(1)]
			)
			return result.documents.length > 0
		} catch (error) {
			// If we can't check, assume it doesn't exist
			return false
		}
	},

	// Enhanced getDocument that checks existence first to avoid 404 console errors
	async getDocumentSafely<T extends Models.Document>(
		collectionId: string,
		documentId: string
	): Promise<T | null> {
		try {
			// First check if the document exists to avoid 404 console spam
			const exists = await this.documentExists(collectionId, documentId)
			if (!exists) {
				return null
			}

			// Document exists, safe to fetch it
			return await databasesInstance.getDocument<T>(
				APPWRITE_DATABASE_ID,
				collectionId,
				documentId
			)
		} catch (error: any) {
			console.error(
				`Appwrite service :: getDocumentSafely :: error for ${collectionId}/${documentId}`,
				error
			)
			return null
		}
	},
	async listDocuments<T extends Models.Document>(
		collectionId: string,
		queries?: string[]
	): Promise<Models.DocumentList<T>> {
		try {
			return await databasesInstance.listDocuments<T>(
				APPWRITE_DATABASE_ID,
				collectionId,
				queries
			)
		} catch (error) {
			console.error(
				`Appwrite service :: listDocuments :: error for ${collectionId}`,
				error
			)
			throw error
		}
	},
	async updateDocument<T extends Models.Document>(
		collectionId: string,
		documentId: string,
		data: Record<string, any>
	): Promise<T> {
		try {
			return await databasesInstance.updateDocument<T>(
				APPWRITE_DATABASE_ID,
				collectionId,
				documentId,
				data as Partial<Omit<T, keyof Models.Document>>
			)
		} catch (error) {
			console.error(
				`Appwrite service :: updateDocument :: error for ${collectionId}/${documentId}`,
				error
			)
			throw error
		}
	},
	async deleteDocument(collectionId: string, documentId: string): Promise<{}> {
		try {
			return await databasesInstance.deleteDocument(
				APPWRITE_DATABASE_ID,
				collectionId,
				documentId
			)
		} catch (error) {
			console.error(
				`Appwrite service :: deleteDocument :: error for ${collectionId}/${documentId}`,
				error
			)
			throw error
		}
	},
}

// Storage Service Functions Wrapper
export const storageService = {
	async uploadFile(
		bucketId: string,
		file: File,
		permissions?: string[]
	): Promise<Models.File> {
		try {
			return await storageInstance.createFile(
				bucketId,
				ID.unique(),
				file,
				permissions
			)
		} catch (error) {
			console.error(
				`Appwrite service :: uploadFile :: error for ${bucketId}`,
				error
			)
			throw error
		}
	},
	getFilePreview(
		bucketId: string,
		fileId: string,
		width?: number,
		height?: number,
		gravity?: string,
		quality?: number,
		borderWidth?: number,
		borderColor?: string,
		borderRadius?: number,
		opacity?: number,
		rotation?: number,
		background?: string,
		output?: ImageFormat
	): string | null {
		// Check for empty or invalid fileId to prevent unnecessary API calls
		if (!fileId || fileId.trim() === '' || fileId.length < 8) {
			console.log(
				`Appwrite service :: getFilePreview :: invalid fileId: ${fileId}`
			)
			return null
		}

		try {
			const previewUrl = storageInstance.getFilePreview(
				bucketId,
				fileId,
				width,
				height,
				gravity as any,
				quality,
				borderWidth,
				borderColor,
				borderRadius,
				opacity,
				rotation,
				background,
				output
			)
			return previewUrl.toString()
		} catch (error) {
			console.error(
				`Appwrite service :: getFilePreview :: error for ${bucketId}/${fileId}`,
				error
			)
			return null
		}
	},
	async getFile(
		bucketId: string,
		fileId: string,
		suppressNotFoundError: boolean = false
	): Promise<Models.File | null> {
		try {
			return await storageInstance.getFile(bucketId, fileId)
		} catch (error: any) {
			// If it's a 404 error and we're suppressing not found errors, return null
			if (suppressNotFoundError && error.code === 404) {
				return null
			}

			console.error(
				`Appwrite service :: getFile :: error for ${bucketId}/${fileId}`,
				error
			)
			throw error
		}
	},

	async deleteFile(
		bucketId: string,
		fileId: string,
		suppressNotFoundError: boolean = true
	): Promise<{} | null> {
		try {
			return await storageInstance.deleteFile(bucketId, fileId)
		} catch (error: any) {
			// If it's a 404 error (file not found), log it differently
			if (error.code === 404) {
				console.log(
					`Appwrite service :: deleteFile :: file not found ${bucketId}/${fileId}`
				)
				// If we're suppressing not found errors, return empty object instead of throwing
				if (suppressNotFoundError) {
					return {}
				}
			} else {
				console.error(
					`Appwrite service :: deleteFile :: error for ${bucketId}/${fileId}`,
					error
				)
			}

			// Only throw if we're not suppressing or if it's not a 404
			if (!suppressNotFoundError || error.code !== 404) {
				throw error
			}
			return null
		}
	},
}

// Type definitions for storage operations
// These are just type definitions, they don't need to exactly match the existing functions
export interface StorageService {
	uploadFile(
		bucketId: string,
		file: File,
		permissions?: string[]
	): Promise<Models.File>

	getFilePreview(
		bucketId: string,
		fileId: string,
		width?: number,
		height?: number,
		gravity?: string,
		quality?: number,
		borderWidth?: number,
		borderColor?: string,
		borderRadius?: number,
		opacity?: number,
		rotation?: number,
		background?: string,
		output?: ImageFormat
	): string | null

	getFile(
		bucketId: string,
		fileId: string,
		suppressNotFoundError?: boolean
	): Promise<Models.File | null>

	deleteFile(
		bucketId: string,
		fileId: string,
		suppressNotFoundError?: boolean
	): Promise<{} | null>
}
