// hooks/use-profile.tsx

import {
	useState,
	useEffect,
	createContext,
	useContext,
	type ReactNode,
	useCallback,
	useRef,
} from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
	databaseService as databases,
	storageService,
	PROFILES_COLLECTION_ID,
	PROFILE_IMAGES_BUCKET_ID,
} from '@/lib/appwrite'
import {
	Permission,
	Role,
	Models,
	AppwriteException,
	type ImageFormat,
} from 'appwrite'
import type { Profile as LocalProfileType } from '@/types/profile'

// Extend LocalProfileType with Appwrite-specific document properties
export interface AppwriteProfile extends LocalProfileType, Models.Document {
	userId: string // Ensure this attribute exists in your Appwrite 'profiles' collection
	profilePictureId?: string // ID of the uploaded image in Appwrite storage
}

type ProfileContextType = {
	profile: LocalProfileType
	updateProfile: (profileData: Partial<LocalProfileType>) => Promise<void>
	/**
	 * Upload a profile picture to Appwrite storage.
	 * Note: This function does not delete any previous profile pictures.
	 * The component using this function should handle deletion of previous images.
	 */
	uploadProfilePicture: (file: File) => Promise<string | null>
	/**
	 * Force refresh the profile picture URL.
	 * Useful after login or when the image doesn't load properly.
	 */
	refreshProfilePicture: () => Promise<void>
	isLoading: boolean
	error: string | null
}

const defaultProfile: LocalProfileType = {
	name: 'New User', // Required field with default
	title: '', // Optional field
	company: 'Unknown', // Required field with default
	email: '', // Required field (will be populated from user)
	phone: '', // Optional field
	socials: {}, // Optional field (stored as JSON string)
	profilePictureId: undefined, // ID of the image in Appwrite storage
	profilePicture: undefined, // Local field for UI display
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth() as {
		user: Models.User<Models.Preferences> | null | undefined
	}
	const [profile, setProfile] = useState<LocalProfileType>(defaultProfile)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Track if we're currently loading to prevent duplicate requests
	const loadingRef = useRef(false)
	const mountedRef = useRef(true)

	const appwriteUserId = user?.$id

	// Helper function to generate a profile picture URL from a file ID
	const generateProfilePictureUrl = async (
		profilePictureId: string
	): Promise<string | undefined> => {
		if (!profilePictureId) {
			return undefined
		}

		try {
			// Verify the file exists
			const fileExists = await storageService.getFile(
				PROFILE_IMAGES_BUCKET_ID,
				profilePictureId,
				true // Suppress not found errors
			)

			if (fileExists) {
				// Generate a fresh URL with timestamp to bypass caching
				const timestamp = new Date().getTime()
				const previewUrl = storageService.getFilePreview(
					PROFILE_IMAGES_BUCKET_ID,
					profilePictureId,
					400, // width
					400, // height
					'center', // gravity
					100, // quality
					0, // borderWidth
					'ffffff', // borderColor (without # prefix)
					0, // borderRadius
					1, // opacity
					0, // rotation
					'ffffff', // background (without # prefix)
					'webp' as ImageFormat // output format
				)

				if (previewUrl) {
					// Create the URL with cache-busting parameter
					const urlWithTimestamp = `${previewUrl}${
						previewUrl.includes('?') ? '&' : '?'
					}_t=${timestamp}`

					// Update the profile state with the new URL
					setProfile((prevProfile) => ({
						...prevProfile,
						profilePicture: urlWithTimestamp,
					}))

					return urlWithTimestamp
				}
			}
			return undefined
		} catch (error) {
			console.error('Failed to generate profile picture URL:', error)
			return undefined
		}
	}

	const loadProfile = useCallback(async () => {
		// Prevent duplicate loading requests
		if (loadingRef.current) {
			console.log('LoadProfile already in progress, skipping...')
			return
		}

		if (!appwriteUserId) {
			setProfile(defaultProfile)
			setIsLoading(false)
			if (typeof window !== 'undefined') {
				const savedProfile = localStorage.getItem('profile')
				if (savedProfile) {
					try {
						setProfile(JSON.parse(savedProfile))
					} catch (e) {
						console.error(
							'Failed to parse profile from localStorage on logout',
							e
						)
					}
				} else {
					setProfile(defaultProfile)
				}
			}
			return
		}

		loadingRef.current = true
		setIsLoading(true)
		setError(null)

		const savedProfileKey = `profile_${appwriteUserId}`
		// Don't set profile state from localStorage to avoid the flash
		// We'll load everything fresh from the database and set state only once

		try {
			// Fetch document using the PROFILES_COLLECTION_ID from env
			const appwriteDoc = await databases.getDocument<AppwriteProfile>(
				PROFILES_COLLECTION_ID, // Correct collection ID from env/appwrite.ts
				appwriteUserId // Document ID is the user's Appwrite Auth ID
			)
			const loadedProfile: LocalProfileType = {
				name: appwriteDoc.name || user?.name || '',
				email: appwriteDoc.email || user?.email || '',
				title: appwriteDoc.title || '',
				company: appwriteDoc.company || '', // Ensure 'company' is fetched
				phone: appwriteDoc.phone || '',
				socials:
					typeof appwriteDoc.socials === 'string'
						? JSON.parse(appwriteDoc.socials)
						: appwriteDoc.socials || {},
				profilePictureId: appwriteDoc.profilePictureId,
				profilePicture: undefined, // Will be set below if picture exists
			}

			// If profile has a picture ID, validate it and get the preview URL BEFORE setting state
			if (
				appwriteDoc.profilePictureId &&
				appwriteDoc.profilePictureId.length > 8
			) {
				try {
					// First verify if the file actually exists
					const fileExists = await storageService.getFile(
						PROFILE_IMAGES_BUCKET_ID,
						appwriteDoc.profilePictureId,
						true // Suppress not found errors
					)

					if (fileExists) {
						// Always generate a fresh URL with a cache-busting timestamp to force reload after login
						const timestamp = new Date().getTime()

						// Get a preview URL for the profile picture using Appwrite storage
						const previewUrl = storageService.getFilePreview(
							PROFILE_IMAGES_BUCKET_ID,
							appwriteDoc.profilePictureId,
							400, // width
							400, // height
							'center', // gravity
							100, // quality
							0, // borderWidth
							'ffffff', // borderColor (without # prefix)
							0, // borderRadius
							1, // opacity
							0, // rotation
							'ffffff', // background (without # prefix)
							'webp' as ImageFormat // output format
						)

						if (previewUrl) {
							// Set the image URL BEFORE setting profile state
							loadedProfile.profilePicture = `${previewUrl}${
								previewUrl.includes('?') ? '&' : '?'
							}_t=${timestamp}`
						}
					} else {
						// If the file doesn't exist but the ID is in the profile, clear the ID
						console.log('Profile has an invalid profilePictureId, clearing it')
						loadedProfile.profilePictureId = undefined

						// Update the profile document to remove the invalid reference
						// Set explicitly to null to ensure it's cleared in the database
						await databases.updateDocument(
							PROFILES_COLLECTION_ID,
							appwriteUserId,
							{ profilePictureId: null }
						)
					}
				} catch (error) {
					console.error('Error verifying profile picture:', error)
					// Don't block profile loading due to picture issues
				}
			}

			// Before storing in localStorage, create a copy that doesn't include the full image URL
			// This prevents storing stale image URLs that might cause issues after login/logout
			const profileForStorage = {
				...loadedProfile,
				// Only store the ID, not the URL which can change or expire
				profilePicture: undefined,
			}

			// Set the profile state ONCE with the complete data including the image URL
			setProfile(loadedProfile)
			localStorage.setItem(savedProfileKey, JSON.stringify(profileForStorage))
		} catch (e: any) {
			const appwriteError = e as AppwriteException
			// Check for 'collection_not_found' as well
			if (
				appwriteError.code === 404 ||
				appwriteError.type === 'document_not_found' ||
				appwriteError.type === 'database_not_found' ||
				appwriteError.type === 'collection_not_found'
			) {
				console.log(
					'Appwrite: Profile not found for user. Initializing with defaults.'
				)
				const initialProfile: LocalProfileType = {
					...defaultProfile,
					name: user?.name || '',
					email: user?.email || '',
					company: defaultProfile.company || '', // Ensure company default is passed
				}
				setProfile(initialProfile)
				localStorage.setItem(savedProfileKey, JSON.stringify(initialProfile))

				// Create the profile in the database when it doesn't exist
				try {
					// Ensure required fields have values according to DB schema
					const payload: Omit<AppwriteProfile, keyof Models.Document> = {
						name: initialProfile.name ?? user?.name ?? 'New User', // Required
						company: initialProfile.company ?? 'Unknown', // Required - only fallback if null/undefined
						email: initialProfile.email ?? user?.email ?? '', // Required
						title: initialProfile.title, // Optional
						phone: initialProfile.phone, // Optional
						socials: JSON.stringify(initialProfile.socials || {}), // Optional
						userId: appwriteUserId, // Required
						profilePictureId: initialProfile.profilePictureId, // Optional
					}

					await databases.createDocumentWithId<AppwriteProfile>(
						PROFILES_COLLECTION_ID,
						appwriteUserId,
						payload,
						[
							Permission.read(Role.user(appwriteUserId!)),
							Permission.update(Role.user(appwriteUserId!)),
							Permission.delete(Role.user(appwriteUserId!)),
						]
					)
					console.log('Appwrite: Created default profile for user in database.')
				} catch (createError: any) {
					console.error(
						'Appwrite: Failed to create initial profile',
						createError
					)
					setError('Failed to initialize profile in database.')
				}
			} else {
				console.error('Appwrite: Failed to fetch profile', appwriteError)
				setError('Failed to load profile from database.')
			}
		} finally {
			setIsLoading(false)
			loadingRef.current = false
		}
	}, [appwriteUserId]) // Only depend on user ID to prevent multiple re-renders

	useEffect(() => {
		mountedRef.current = true
		loadProfile()

		return () => {
			mountedRef.current = false
			loadingRef.current = false
		}
	}, [loadProfile])

	const uploadProfilePicture = async (file: File): Promise<string | null> => {
		if (!appwriteUserId) {
			setError('User not authenticated. Cannot upload profile picture.')
			return null
		}

		// Validate file type
		const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
		if (!allowedTypes.includes(file.type)) {
			console.error(
				`Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(
					', '
				)}`
			)
			setError(
				`Invalid file type. Allowed types: ${allowedTypes
					.map((t) => t.replace('image/', ''))
					.join(', ')}`
			)
			return null
		}

		// Validate file size (5MB limit)
		const maxSize = 5 * 1024 * 1024 // 5MB
		if (file.size > maxSize) {
			console.error(
				`File too large: ${(file.size / (1024 * 1024)).toFixed(
					2
				)}MB. Max size: 5MB`
			)
			setError('Profile picture must be less than 5MB')
			return null
		}

		try {
			// Upload the file to Appwrite storage with permissions
			const uploadedFile = await storageService.uploadFile(
				PROFILE_IMAGES_BUCKET_ID,
				file,
				[
					Permission.read(Role.user(appwriteUserId)),
					Permission.update(Role.user(appwriteUserId)),
					Permission.delete(Role.user(appwriteUserId)),
				]
			)

			// Verify the upload was successful by checking if we can get the file
			try {
				await storageService.getFile(PROFILE_IMAGES_BUCKET_ID, uploadedFile.$id)
			} catch (verifyError) {
				console.error('Failed to verify uploaded file:', verifyError)
				// Still continue since we have the file ID from the upload
			}

			// Return the file ID for storing in the profile document
			return uploadedFile.$id
		} catch (error: any) {
			console.error('Appwrite: Failed to upload profile picture', error)

			// Provide more specific error messages based on the error type
			if (error.code === 401) {
				setError('Authentication error. Please sign in again.')
			} else if (error.code === 413) {
				setError('File is too large. Maximum size is 5MB.')
			} else {
				setError(
					`Failed to upload profile picture: ${
						error.message || 'Unknown error'
					}`
				)
			}
			return null
		}
	}

	const updateProfile = async (newProfileData: Partial<LocalProfileType>) => {
		if (!appwriteUserId) {
			setError('User not authenticated. Profile not saved.')
			const updatedLocalProfile = { ...profile, ...newProfileData }
			setProfile(updatedLocalProfile)
			localStorage.setItem('profile', JSON.stringify(updatedLocalProfile))
			return
		}

		setIsLoading(true)
		setError(null)

		// Merge current profile with new data to ensure all required fields are present in payload
		const currentFullProfile = { ...profile, ...newProfileData }

		// Get the existing document from Appwrite first to see what fields it actually has
		try {
			// Try to get the document to see if it exists and what fields it has
			await databases.getDocument<AppwriteProfile>(
				PROFILES_COLLECTION_ID,
				appwriteUserId
			)
		} catch (e: any) {
			// If the document doesn't exist, we'll handle it in the update section below
			console.log(
				'Document does not exist yet, will be created in the update section'
			)
		}

		// Construct payload including all required attributes for your Appwrite 'profiles' collection
		// The Omit type should now exclude '$id' and other Appwrite specific document fields
		// Ensure required fields match exactly what's in your database schema
		const payload: Omit<AppwriteProfile, keyof Models.Document> = {
			name: currentFullProfile.name ?? user?.name ?? 'New User', // Required
			company: currentFullProfile.company ?? 'Unknown', // Required - only fallback if null/undefined
			email: currentFullProfile.email ?? user?.email ?? '', // Required
			title: currentFullProfile.title, // Optional
			phone: currentFullProfile.phone, // Optional
			socials: JSON.stringify(currentFullProfile.socials || {}), // Optional
			userId: appwriteUserId, // Required
			// Special handling for profilePictureId to ensure null is properly persisted
			profilePictureId:
				currentFullProfile.profilePictureId === null ||
				currentFullProfile.profilePictureId === undefined ||
				currentFullProfile.profilePictureId === ''
					? null
					: currentFullProfile.profilePictureId,
		}

		const savedProfileKey = `profile_${appwriteUserId}`

		try {
			// Attempt to update the document first
			const updatedDoc = await databases.updateDocument<AppwriteProfile>(
				PROFILES_COLLECTION_ID, // Use the constant derived from .env
				appwriteUserId, // Document ID is the user's Appwrite Auth ID
				payload
			)
			const newProfileState: LocalProfileType = {
				name: updatedDoc.name,
				title: updatedDoc.title,
				company: updatedDoc.company,
				email: updatedDoc.email,
				phone: updatedDoc.phone,
				socials:
					typeof updatedDoc.socials === 'string'
						? JSON.parse(updatedDoc.socials)
						: updatedDoc.socials || {},
				profilePictureId: updatedDoc.profilePictureId,
				profilePicture: currentFullProfile.profilePicture, // Keep the existing preview URL
			}

			// For localStorage, don't store the actual image URL which might expire or change
			const profileForStorage = {
				...newProfileState,
				profilePicture: undefined,
			}

			setProfile(newProfileState)
			localStorage.setItem(savedProfileKey, JSON.stringify(profileForStorage))

			// If profilePictureId was updated and exists, generate the profile picture URL
			if (
				updatedDoc.profilePictureId &&
				updatedDoc.profilePictureId !== profile.profilePictureId
			) {
				console.log('Profile picture ID updated, generating URL...')
				await generateProfilePictureUrl(updatedDoc.profilePictureId)
			}
		} catch (e: any) {
			const appwriteError = e as AppwriteException
			// Handle document not found (404) or other not found errors
			if (
				appwriteError.code === 404 ||
				appwriteError.type === 'document_not_found' ||
				appwriteError.type === 'database_not_found' ||
				appwriteError.type === 'collection_not_found'
			) {
				console.log(
					'Appwrite: Profile document not found, attempting to create it.'
				)
				try {
					// If document not found, create a new one with the user's ID as its $id
					const createdDoc =
						await databases.createDocumentWithId<AppwriteProfile>(
							PROFILES_COLLECTION_ID, // Use the constant derived from .env
							appwriteUserId, // Explicitly provide the user's ID as the document ID
							payload, // Payload should contain all required attributes
							[
								Permission.read(Role.user(appwriteUserId!)),
								Permission.update(Role.user(appwriteUserId!)),
								Permission.delete(Role.user(appwriteUserId!)),
							]
						)
					const newProfileState: LocalProfileType = {
						name: createdDoc.name,
						title: createdDoc.title,
						company: createdDoc.company,
						email: createdDoc.email,
						phone: createdDoc.phone,
						socials:
							typeof createdDoc.socials === 'string'
								? JSON.parse(createdDoc.socials)
								: createdDoc.socials || {},
						profilePictureId: createdDoc.profilePictureId,
						profilePicture: currentFullProfile.profilePicture, // Keep the existing preview URL
					}

					// For localStorage, don't store the actual image URL which might expire or change
					const profileForStorage = {
						...newProfileState,
						profilePicture: undefined,
					}

					setProfile(newProfileState)
					localStorage.setItem(
						savedProfileKey,
						JSON.stringify(profileForStorage)
					)

					// If profilePictureId was created and exists, generate the profile picture URL
					if (createdDoc.profilePictureId) {
						console.log('Profile picture ID created, generating URL...')
						await generateProfilePictureUrl(createdDoc.profilePictureId)
					}
				} catch (createError: any) {
					console.error('Appwrite: Failed to create profile', createError)
					// Check for specific attribute validation errors here if needed
					setError('Failed to save profile to database (creation failed).')
				}
			} else {
				console.error('Appwrite: Failed to update profile', appwriteError)
				setError('Failed to save profile to database (update failed).')
			}
		} finally {
			setIsLoading(false)
		}
	}

	// Function to refresh the profile picture URL (useful after login or when image doesn't load)
	const refreshProfilePicture = useCallback(async () => {
		if (!appwriteUserId) {
			return
		}

		console.log('Refreshing profile picture...')

		// Always get the latest profilePictureId from the database to avoid stale state
		let profilePicId: string | undefined

		try {
			// Fetch the latest profile from the database
			const dbProfile = await databases.getDocument<AppwriteProfile>(
				PROFILES_COLLECTION_ID,
				appwriteUserId
			)

			profilePicId = dbProfile.profilePictureId || undefined
			console.log('ProfilePictureId from database:', profilePicId)
		} catch (error) {
			console.error(
				'Error fetching profile from database during refresh:',
				error
			)
			return
		}

		if (!profilePicId) {
			console.log('No profile picture ID found, clearing profile picture')
			setProfile((prevProfile) => ({
				...prevProfile,
				profilePictureId: undefined,
				profilePicture: undefined,
			}))
			return
		}

		try {
			// Verify the file exists
			const fileExists = await storageService.getFile(
				PROFILE_IMAGES_BUCKET_ID,
				profilePicId,
				true // Suppress not found errors
			)

			if (fileExists) {
				console.log('Profile picture file found, generating URL')
				// Generate a fresh URL with timestamp to bypass caching
				const timestamp = new Date().getTime()
				const previewUrl = storageService.getFilePreview(
					PROFILE_IMAGES_BUCKET_ID,
					profilePicId,
					400,
					400,
					'center',
					100,
					0,
					'ffffff',
					0,
					1,
					0,
					'ffffff',
					'webp' as ImageFormat
				)

				if (previewUrl) {
					// Update the profile with the fresh URL
					const newUrl = `${previewUrl}${
						previewUrl.includes('?') ? '&' : '?'
					}_t=${timestamp}`
					console.log(
						'Setting new profile picture URL with timestamp:',
						timestamp
					)

					setProfile((prevProfile) => ({
						...prevProfile,
						profilePictureId: profilePicId, // Ensure this is set correctly
						profilePicture: newUrl,
					}))
				}
			} else if (profilePicId) {
				// If file doesn't exist but we have an ID, clear it
				console.log('Profile picture not found in storage, clearing reference')

				// Update local state
				setProfile((prevProfile) => ({
					...prevProfile,
					profilePictureId: undefined,
					profilePicture: undefined,
				}))

				// Update the database
				await databases.updateDocument(PROFILES_COLLECTION_ID, appwriteUserId, {
					profilePictureId: null,
				})
			}
		} catch (error) {
			console.error('Failed to refresh profile picture:', error)
		}
	}, [appwriteUserId]) // Removed profile.profilePictureId dependency to avoid stale closures

	return (
		<ProfileContext.Provider
			value={{
				profile,
				updateProfile,
				uploadProfilePicture,
				isLoading,
				error,
				refreshProfilePicture,
			}}
		>
			{children}
		</ProfileContext.Provider>
	)
}

export function useProfile() {
	const context = useContext(ProfileContext)
	if (context === undefined) {
		throw new Error('useProfile must be used within a ProfileProvider')
	}
	return context
}
