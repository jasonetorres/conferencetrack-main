// hooks/use-profile.tsx

import {
	useState,
	useEffect,
	createContext,
	useContext,
	type ReactNode,
	useCallback,
} from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
	databaseService as databases,
	PROFILES_COLLECTION_ID,
} from '@/lib/appwrite'
import { Permission, Role, Models, AppwriteException } from 'appwrite'
import type { Profile as LocalProfileType } from '@/types/profile'

// Extend LocalProfileType with Appwrite-specific document properties and attributes
export interface AppwriteProfile extends LocalProfileType, Models.Document {
	userId: string // Ensure this attribute exists in your Appwrite 'profiles' collection
}

type ProfileContextType = {
	profile: LocalProfileType
	updateProfile: (profileData: Partial<LocalProfileType>) => Promise<void>
	isLoading: boolean
	error: string | null
}

const defaultProfile: LocalProfileType = {
	name: 'New User', // Required field with default
	title: '',        // Optional field
	company: 'Unknown', // Required field with default
	email: '',        // Required field (will be populated from user)
	phone: '',        // Optional field
	socials: {},      // Optional field (stored as JSON string)
	profilePicture: undefined, // Local field, not in Appwrite schema
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth() as {
		user: Models.User<Models.Preferences> | null | undefined
	}
	const [profile, setProfile] = useState<LocalProfileType>(defaultProfile)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const appwriteUserId = user?.$id

	const loadProfile = useCallback(async () => {
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

		setIsLoading(true)
		setError(null)

		const savedProfileKey = `profile_${appwriteUserId}`
		const savedProfile = localStorage.getItem(savedProfileKey)
		if (savedProfile) {
			try {
				const parsed = JSON.parse(savedProfile) as LocalProfileType
				setProfile(parsed)
			} catch (e) {
				console.error('Failed to parse profile from localStorage', e)
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
				name: appwriteDoc.name || user?.name || '',
				email: appwriteDoc.email || user?.email || '',
				title: appwriteDoc.title || '',
				company: appwriteDoc.company || '', // Ensure 'company' is fetched
				phone: appwriteDoc.phone || '',
				socials:
					typeof appwriteDoc.socials === 'string'
						? JSON.parse(appwriteDoc.socials)
						: appwriteDoc.socials || {},
				profilePicture: undefined, // This field doesn't exist in your schema
			}
			setProfile(loadedProfile)
			localStorage.setItem(savedProfileKey, JSON.stringify(loadedProfile))
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
						name: initialProfile.name || user?.name || 'New User', // Required
						company: initialProfile.company || 'Unknown', // Required
						email: initialProfile.email || user?.email || '', // Required
						title: initialProfile.title, // Optional
						phone: initialProfile.phone, // Optional
						socials: JSON.stringify(initialProfile.socials || {}), // Optional
						userId: appwriteUserId, // Required
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
		}
	}, [appwriteUserId, user?.name, user?.email]) // Dependencies for useCallback

	useEffect(() => {
		loadProfile()
	}, [loadProfile])

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
			name: currentFullProfile.name || user?.name || 'New User', // Required
			company: currentFullProfile.company || 'Unknown', // Required 
			email: currentFullProfile.email || user?.email || '', // Required
			title: currentFullProfile.title, // Optional
			phone: currentFullProfile.phone, // Optional
			socials: JSON.stringify(currentFullProfile.socials || {}), // Optional
			userId: appwriteUserId, // Required
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
				profilePicture: undefined, // This field doesn't exist in your schema
			}
			setProfile(newProfileState)
			localStorage.setItem(savedProfileKey, JSON.stringify(newProfileState))
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
						profilePicture: undefined, // This field doesn't exist in your schema
					}
					setProfile(newProfileState)
					localStorage.setItem(savedProfileKey, JSON.stringify(newProfileState))
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

	return (
		<ProfileContext.Provider
			value={{ profile, updateProfile, isLoading, error }}
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
