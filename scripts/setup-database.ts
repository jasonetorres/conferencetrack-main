import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Initialize Appwrite SDK client (server-side with API key)
const client = new Client()

// Environment variables
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const apiKey = process.env.APPWRITE_API_KEY // This should be added to your .env.local file

// Exit if environment variables are missing
if (!endpoint || !projectId || !apiKey) {
	console.error(
		'Error: Appwrite credentials missing from environment variables.'
	)
	console.error(
		'Make sure you have NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, and APPWRITE_API_KEY in your .env.local file.'
	)
	process.exit(1)
}

// Initialize the client
client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey)

// Initialize Appwrite services
const databases = new Databases(client)
const storage = new Storage(client)

// Constants (must match those in your app)
const DATABASE_ID = 'main_db'
const DATABASE_NAME = 'Conference Track Database'

// Collection IDs
const PROFILES_COLLECTION_ID = 'profiles'
const PROFILE_SETTINGS_COLLECTION_ID = 'profile_settings'
const CONTACTS_COLLECTION_ID = 'contacts'
const CONTACT_DETAILS_COLLECTION_ID = 'contact_details'
const QR_SETTINGS_COLLECTION_ID = 'qr_settings'
const CONFERENCES_COLLECTION_ID = 'conferences'
const CONFERENCE_DETAILS_COLLECTION_ID = 'conference_details'
const ATTENDEES_COLLECTION_ID = 'attendees'
const SESSIONS_COLLECTION_ID = 'sessions'
const SPEAKERS_COLLECTION_ID = 'speakers'
const SPEAKER_DETAILS_COLLECTION_ID = 'speaker_details'

// Storage bucket IDs
const PROFILE_IMAGES_BUCKET_ID = 'profile_images'
const CONFERENCE_IMAGES_BUCKET_ID = 'conference_images'

// Helper to create the database
async function createDatabase() {
	try {
		console.log(`Creating database '${DATABASE_NAME}'...`)
		const database = await databases.create(DATABASE_ID, DATABASE_NAME)
		console.log(`✅ Database created: ${database.name}`)
		return database
	} catch (error: any) {
		if (error.code === 409) {
			console.log(`⚠️ Database '${DATABASE_NAME}' already exists, skipping...`)
			return { $id: DATABASE_ID, name: DATABASE_NAME }
		}
		console.error('❌ Failed to create database:', error)
		throw error
	}
}

// Helper to create a collection with attributes
async function createCollection(collectionId: string, collectionName: string) {
	try {
		console.log(`Creating collection '${collectionName}'...`)
		const collection = await databases.createCollection(
			DATABASE_ID,
			collectionId,
			collectionName,
			[
				// Default permission: any user can read, all authenticated users can write
				Permission.read('any'),
				Permission.write('users'),
				// Add admin role if needed
				// Permission.read('team:admin'),
				// Permission.write('team:admin'),
			]
		)
		console.log(`✅ Collection created: ${collection.name}`)
		return collection
	} catch (error: any) {
		if (error.code === 409) {
			console.log(
				`⚠️ Collection '${collectionName}' already exists, skipping...`
			)
			return { $id: collectionId, name: collectionName }
		}
		console.error(`❌ Failed to create collection '${collectionName}':`, error)
		throw error
	}
}

// Helper to create attributes for a collection
async function createAttribute(
	collectionId: string,
	attributeType: string,
	attributeId: string,
	attributeConfig: any
) {
	try {
		console.log(
			`Creating ${attributeType} attribute '${attributeId}' for collection '${collectionId}'...`
		)

		// Based on attribute type, call the appropriate method
		let attribute
		switch (attributeType) {
			case 'string':
				attribute = await databases.createStringAttribute(
					DATABASE_ID,
					collectionId,
					attributeId,
					attributeConfig.size || 255,
					attributeConfig.required,
					attributeConfig.default,
					attributeConfig.array
				)
				break
			case 'integer':
				attribute = await databases.createIntegerAttribute(
					DATABASE_ID,
					collectionId,
					attributeId,
					attributeConfig.required,
					attributeConfig.min,
					attributeConfig.max,
					attributeConfig.default,
					attributeConfig.array
				)
				break
			case 'float':
				attribute = await databases.createFloatAttribute(
					DATABASE_ID,
					collectionId,
					attributeId,
					attributeConfig.required,
					attributeConfig.min,
					attributeConfig.max,
					attributeConfig.default,
					attributeConfig.array
				)
				break
			case 'boolean':
				attribute = await databases.createBooleanAttribute(
					DATABASE_ID,
					collectionId,
					attributeId,
					attributeConfig.required,
					attributeConfig.default,
					attributeConfig.array
				)
				break
			case 'datetime':
				attribute = await databases.createDatetimeAttribute(
					DATABASE_ID,
					collectionId,
					attributeId,
					attributeConfig.required,
					attributeConfig.default,
					attributeConfig.array
				)
				break
			case 'email':
				attribute = await databases.createEmailAttribute(
					DATABASE_ID,
					collectionId,
					attributeId,
					attributeConfig.required,
					attributeConfig.default,
					attributeConfig.array
				)
				break
			case 'enum':
				attribute = await databases.createEnumAttribute(
					DATABASE_ID,
					collectionId,
					attributeId,
					attributeConfig.elements,
					attributeConfig.required,
					attributeConfig.default,
					attributeConfig.array
				)
				break
			case 'url':
				attribute = await databases.createUrlAttribute(
					DATABASE_ID,
					collectionId,
					attributeId,
					attributeConfig.required,
					attributeConfig.default,
					attributeConfig.array
				)
				break
			case 'ip':
				attribute = await databases.createIpAttribute(
					DATABASE_ID,
					collectionId,
					attributeId,
					attributeConfig.required,
					attributeConfig.default,
					attributeConfig.array
				)
				break
			case 'json':
				// JSON attributes are not supported, use large string instead
				attribute = await databases.createStringAttribute(
					DATABASE_ID,
					collectionId,
					attributeId,
					65535, // Maximum size string for JSON data
					attributeConfig.required,
					attributeConfig.default
				)
				break
			default:
				throw new Error(`Unsupported attribute type: ${attributeType}`)
		}

		console.log(`✅ Attribute '${attributeId}' created`)
		return attribute
	} catch (error: any) {
		if (error.code === 409) {
			console.log(`⚠️ Attribute '${attributeId}' already exists, skipping...`)
			return null
		}
		console.error(`❌ Failed to create attribute '${attributeId}':`, error)
		return null
	}
}

// Helper to create indexes for a collection
async function createIndex(
	collectionId: string,
	indexId: string,
	indexType: string,
	attributes: string[]
) {
	try {
		console.log(
			`Creating index '${indexId}' for collection '${collectionId}'...`
		)
		const index = await databases.createIndex(
			DATABASE_ID,
			collectionId,
			indexId,
			indexType,
			attributes
		)
		console.log(`✅ Index '${indexId}' created`)
		return index
	} catch (error: any) {
		if (error.code === 409) {
			console.log(`⚠️ Index '${indexId}' already exists, skipping...`)
			return null
		}
		console.error(`❌ Failed to create index '${indexId}':`, error)
		return null
	}
}

// Helper to create a storage bucket
async function createBucket(bucketId: string, bucketName: string) {
	try {
		console.log(`Creating storage bucket '${bucketName}'...`)
		const bucket = await storage.createBucket(bucketId, bucketName)

		// Update permissions separately
		await storage.updateBucket(
			bucketId,
			undefined, // name (undefined to keep existing)
			[Permission.read('any'), Permission.write('users')]
		)

		console.log(`✅ Storage bucket created: ${bucket.name}`)
		return bucket
	} catch (error: any) {
		if (error.code === 409) {
			console.log(
				`⚠️ Storage bucket '${bucketName}' already exists, skipping...`
			)
			return { $id: bucketId, name: bucketName }
		}
		console.error(`❌ Failed to create storage bucket '${bucketName}':`, error)
		throw error
	}
}

// Setup profiles collection
async function setupProfilesCollection() {
	const collection = await createCollection(
		PROFILES_COLLECTION_ID,
		'User Profiles'
	)

	// Create basic profile attributes
	await createAttribute(PROFILES_COLLECTION_ID, 'string', 'userId', {
		required: true,
		size: 36,
	})
	await createAttribute(PROFILES_COLLECTION_ID, 'string', 'name', {
		required: true,
		size: 100,
	})
	await createAttribute(PROFILES_COLLECTION_ID, 'email', 'email', {
		required: true,
	})
	await createAttribute(PROFILES_COLLECTION_ID, 'string', 'title', {
		required: false,
		size: 100,
	}) // Mapped to jobTitle in UI
	await createAttribute(PROFILES_COLLECTION_ID, 'string', 'bio', {
		required: false,
		size: 1000,
	})
	await createAttribute(PROFILES_COLLECTION_ID, 'string', 'company', {
		required: false,
		size: 100,
	})
	await createAttribute(PROFILES_COLLECTION_ID, 'string', 'phone', {
		required: false,
		size: 20,
	}) // Mapped to phoneNumber in UI
	await createAttribute(PROFILES_COLLECTION_ID, 'string', 'socials', {
		required: false,
		size: 255,
	}) // Added this for JSON string of socials
	await createAttribute(PROFILES_COLLECTION_ID, 'string', 'profilePicture', {
		required: false,
		size: 255,
	}) // URL for profile picture

	// Create indexes
	await createIndex(PROFILES_COLLECTION_ID, 'user_idx', 'key', ['userId'])
	await createIndex(PROFILES_COLLECTION_ID, 'email_idx', 'key', ['email'])

	return collection
}

// Setup profile settings collection (split from profiles to avoid attribute limit)
async function setupProfileSettingsCollection() {
	const collection = await createCollection(
		PROFILE_SETTINGS_COLLECTION_ID,
		'User Profile Settings'
	)

	// Create profile settings attributes
	await createAttribute(PROFILE_SETTINGS_COLLECTION_ID, 'string', 'userId', {
		required: true,
		size: 36,
	})
	await createAttribute(PROFILE_SETTINGS_COLLECTION_ID, 'json', 'social', {
		required: false,
	}) // Will be created as string
	await createAttribute(PROFILE_SETTINGS_COLLECTION_ID, 'url', 'avatarUrl', {
		required: false,
	})
	await createAttribute(
		PROFILE_SETTINGS_COLLECTION_ID,
		'string',
		'avatarFileId',
		{ required: false, size: 36 }
	)
	await createAttribute(PROFILE_SETTINGS_COLLECTION_ID, 'json', 'settings', {
		required: false,
	}) // Will be created as string
	await createAttribute(PROFILE_SETTINGS_COLLECTION_ID, 'boolean', 'darkMode', {
		required: false,
		default: false,
	})
	await createAttribute(
		PROFILE_SETTINGS_COLLECTION_ID,
		'boolean',
		'emailNotifications',
		{ required: false, default: true }
	)

	// Create indexes
	await createIndex(PROFILE_SETTINGS_COLLECTION_ID, 'user_idx', 'unique', [
		'userId',
	])

	return collection
}

// Setup contacts collection
async function setupContactsCollection() {
	const collection = await createCollection(CONTACTS_COLLECTION_ID, 'Contacts')

	// Create basic contact attributes
	await createAttribute(CONTACTS_COLLECTION_ID, 'string', 'userId', {
		required: true,
		size: 36,
	})
	await createAttribute(CONTACTS_COLLECTION_ID, 'string', 'contactUserId', {
		required: false,
		size: 36,
	})
	await createAttribute(CONTACTS_COLLECTION_ID, 'string', 'name', {
		required: true,
		size: 100,
	})
	await createAttribute(CONTACTS_COLLECTION_ID, 'email', 'email', {
		required: false,
	})
	await createAttribute(CONTACTS_COLLECTION_ID, 'string', 'phoneNumber', {
		required: false,
		size: 20,
	})
	await createAttribute(CONTACTS_COLLECTION_ID, 'string', 'company', {
		required: false,
		size: 100,
	})
	await createAttribute(CONTACTS_COLLECTION_ID, 'string', 'jobTitle', {
		required: false,
		size: 100,
	})
	await createAttribute(CONTACTS_COLLECTION_ID, 'boolean', 'isStarred', {
		required: false,
		default: false,
	})

	// Create indexes
	await createIndex(CONTACTS_COLLECTION_ID, 'user_idx', 'key', ['userId'])
	await createIndex(CONTACTS_COLLECTION_ID, 'starred_idx', 'key', [
		'userId',
		'isStarred',
	])

	return collection
}

// Setup contact details collection (split from contacts to avoid attribute limit)
async function setupContactDetailsCollection() {
	const collection = await createCollection(
		CONTACT_DETAILS_COLLECTION_ID,
		'Contact Details'
	)

	// Create extended contact attributes
	await createAttribute(CONTACT_DETAILS_COLLECTION_ID, 'string', 'contactId', {
		required: true,
		size: 36,
	})
	await createAttribute(CONTACT_DETAILS_COLLECTION_ID, 'string', 'notes', {
		required: false,
		size: 1000,
	})
	await createAttribute(
		CONTACT_DETAILS_COLLECTION_ID,
		'string',
		'conferenceId',
		{ required: false, size: 36 }
	)
	await createAttribute(
		CONTACT_DETAILS_COLLECTION_ID,
		'string',
		'meetingLocation',
		{ required: false, size: 100 }
	)
	await createAttribute(
		CONTACT_DETAILS_COLLECTION_ID,
		'datetime',
		'meetingDate',
		{ required: false }
	)
	await createAttribute(CONTACT_DETAILS_COLLECTION_ID, 'string', 'tags', {
		required: false,
		array: true,
		size: 50,
	})
	await createAttribute(CONTACT_DETAILS_COLLECTION_ID, 'string', 'socialData', {
		required: false,
		size: 5000,
	}) // Stringified JSON

	// Create indexes
	await createIndex(CONTACT_DETAILS_COLLECTION_ID, 'contact_idx', 'unique', [
		'contactId',
	])
	await createIndex(CONTACT_DETAILS_COLLECTION_ID, 'conference_idx', 'key', [
		'conferenceId',
	])

	return collection
}

// Setup QR settings collection
async function setupQRSettingsCollection() {
	const collection = await createCollection(
		QR_SETTINGS_COLLECTION_ID,
		'QR Code Settings'
	)

	// Create attributes
	await createAttribute(QR_SETTINGS_COLLECTION_ID, 'string', 'userId', {
		required: true,
		size: 36,
	})
	await createAttribute(QR_SETTINGS_COLLECTION_ID, 'enum', 'design', {
		required: false, // Changed to false to allow default value
		elements: ['basic', 'profile', 'minimal', 'branded'],
		default: 'basic',
	})
	await createAttribute(QR_SETTINGS_COLLECTION_ID, 'boolean', 'includeName', {
		required: false,
		default: true,
	})
	await createAttribute(QR_SETTINGS_COLLECTION_ID, 'boolean', 'includeEmail', {
		required: false,
		default: true,
	})
	await createAttribute(
		QR_SETTINGS_COLLECTION_ID,
		'boolean',
		'includeCompany',
		{ required: false, default: true }
	)
	await createAttribute(
		QR_SETTINGS_COLLECTION_ID,
		'boolean',
		'includeJobTitle',
		{ required: false, default: true }
	)
	await createAttribute(QR_SETTINGS_COLLECTION_ID, 'boolean', 'includePhone', {
		required: false,
		default: false,
	})
	await createAttribute(QR_SETTINGS_COLLECTION_ID, 'boolean', 'includeSocial', {
		required: false,
		default: true,
	})
	await createAttribute(
		QR_SETTINGS_COLLECTION_ID,
		'string',
		'customField1Label',
		{ required: false, size: 50 }
	)
	await createAttribute(
		QR_SETTINGS_COLLECTION_ID,
		'string',
		'customField1Value',
		{ required: false, size: 100 }
	)
	await createAttribute(
		QR_SETTINGS_COLLECTION_ID,
		'string',
		'customField2Label',
		{ required: false, size: 50 }
	)
	await createAttribute(
		QR_SETTINGS_COLLECTION_ID,
		'string',
		'customField2Value',
		{ required: false, size: 100 }
	)
	await createAttribute(QR_SETTINGS_COLLECTION_ID, 'string', 'logoFileId', {
		required: false,
		size: 36,
	})
	await createAttribute(QR_SETTINGS_COLLECTION_ID, 'string', 'primaryColor', {
		required: false,
		size: 7,
	})
	await createAttribute(QR_SETTINGS_COLLECTION_ID, 'string', 'secondaryColor', {
		required: false,
		size: 7,
	})

	// Create indexes
	await createIndex(QR_SETTINGS_COLLECTION_ID, 'user_idx', 'unique', ['userId'])

	return collection
}

// Setup conferences collection
async function setupConferencesCollection() {
	const collection = await createCollection(
		CONFERENCES_COLLECTION_ID,
		'Conferences'
	)

	// Create core conference attributes
	await createAttribute(CONFERENCES_COLLECTION_ID, 'string', 'name', {
		required: true,
		size: 100,
	})
	await createAttribute(CONFERENCES_COLLECTION_ID, 'datetime', 'startDate', {
		required: true,
	})
	await createAttribute(CONFERENCES_COLLECTION_ID, 'datetime', 'endDate', {
		required: true,
	})
	await createAttribute(CONFERENCES_COLLECTION_ID, 'string', 'location', {
		required: true,
		size: 100,
	})
	await createAttribute(CONFERENCES_COLLECTION_ID, 'string', 'organizerId', {
		required: true,
		size: 36,
	})
	await createAttribute(CONFERENCES_COLLECTION_ID, 'string', 'organizerName', {
		required: false,
		size: 100,
	})
	await createAttribute(CONFERENCES_COLLECTION_ID, 'boolean', 'isPublic', {
		required: false,
		default: false,
	})
	await createAttribute(CONFERENCES_COLLECTION_ID, 'enum', 'status', {
		required: false, // Changed to false to allow default value
		elements: ['draft', 'published', 'archived', 'completed'],
		default: 'draft',
	})
	await createAttribute(CONFERENCES_COLLECTION_ID, 'integer', 'capacity', {
		required: false,
	})

	// Create indexes
	await createIndex(CONFERENCES_COLLECTION_ID, 'organizer_idx', 'key', [
		'organizerId',
	])
	await createIndex(CONFERENCES_COLLECTION_ID, 'status_idx', 'key', ['status'])
	await createIndex(CONFERENCES_COLLECTION_ID, 'public_idx', 'key', [
		'isPublic',
	])
	await createIndex(CONFERENCES_COLLECTION_ID, 'date_idx', 'key', ['startDate'])

	return collection
}

// Setup conference details collection (split from conferences to avoid attribute limit)
async function setupConferenceDetailsCollection() {
	const collection = await createCollection(
		CONFERENCE_DETAILS_COLLECTION_ID,
		'Conference Details'
	)

	// Create extended conference attributes
	await createAttribute(
		CONFERENCE_DETAILS_COLLECTION_ID,
		'string',
		'conferenceId',
		{ required: true, size: 36 }
	)
	await createAttribute(
		CONFERENCE_DETAILS_COLLECTION_ID,
		'string',
		'description',
		{ required: false, size: 5000 }
	)
	await createAttribute(CONFERENCE_DETAILS_COLLECTION_ID, 'string', 'venue', {
		required: false,
		size: 100,
	})
	await createAttribute(CONFERENCE_DETAILS_COLLECTION_ID, 'url', 'website', {
		required: false,
	})
	await createAttribute(CONFERENCE_DETAILS_COLLECTION_ID, 'url', 'logoUrl', {
		required: false,
	})
	await createAttribute(
		CONFERENCE_DETAILS_COLLECTION_ID,
		'string',
		'logoFileId',
		{ required: false, size: 36 }
	)
	await createAttribute(
		CONFERENCE_DETAILS_COLLECTION_ID,
		'url',
		'coverImageUrl',
		{ required: false }
	)
	await createAttribute(
		CONFERENCE_DETAILS_COLLECTION_ID,
		'string',
		'coverImageFileId',
		{ required: false, size: 36 }
	)
	await createAttribute(CONFERENCE_DETAILS_COLLECTION_ID, 'string', 'tags', {
		required: false,
		array: true,
		size: 50,
	})
	await createAttribute(
		CONFERENCE_DETAILS_COLLECTION_ID,
		'url',
		'registrationLink',
		{ required: false }
	)
	await createAttribute(
		CONFERENCE_DETAILS_COLLECTION_ID,
		'email',
		'contactEmail',
		{ required: false }
	)
	await createAttribute(
		CONFERENCE_DETAILS_COLLECTION_ID,
		'string',
		'contactPhone',
		{ required: false, size: 20 }
	)
	await createAttribute(CONFERENCE_DETAILS_COLLECTION_ID, 'string', 'agenda', {
		required: false,
		size: 5000,
	})

	// Create indexes
	await createIndex(
		CONFERENCE_DETAILS_COLLECTION_ID,
		'conference_idx',
		'unique',
		['conferenceId']
	)

	return collection
}

// Setup attendees collection
async function setupAttendeesCollection() {
	const collection = await createCollection(
		ATTENDEES_COLLECTION_ID,
		'Conference Attendees'
	)

	// Create attributes
	await createAttribute(ATTENDEES_COLLECTION_ID, 'string', 'userId', {
		required: true,
		size: 36,
	})
	await createAttribute(ATTENDEES_COLLECTION_ID, 'string', 'conferenceId', {
		required: true,
		size: 36,
	})
	await createAttribute(
		ATTENDEES_COLLECTION_ID,
		'datetime',
		'registrationDate',
		{ required: true }
	)
	await createAttribute(ATTENDEES_COLLECTION_ID, 'datetime', 'checkInDate', {
		required: false,
	})
	await createAttribute(ATTENDEES_COLLECTION_ID, 'enum', 'ticketType', {
		required: false,
		elements: ['standard', 'vip', 'speaker', 'sponsor', 'organizer'],
		default: 'standard',
	})
	await createAttribute(ATTENDEES_COLLECTION_ID, 'string', 'ticketId', {
		required: false,
		size: 36,
	})
	await createAttribute(ATTENDEES_COLLECTION_ID, 'enum', 'status', {
		required: false, // Changed to false to allow default value
		elements: ['registered', 'checked-in', 'cancelled', 'no-show'],
		default: 'registered',
	})
	await createAttribute(ATTENDEES_COLLECTION_ID, 'string', 'notes', {
		required: false,
		size: 1000,
	})
	await createAttribute(ATTENDEES_COLLECTION_ID, 'boolean', 'isOrganizer', {
		required: false,
		default: false,
	})
	await createAttribute(ATTENDEES_COLLECTION_ID, 'boolean', 'isSpeaker', {
		required: false,
		default: false,
	})
	await createAttribute(ATTENDEES_COLLECTION_ID, 'string', 'sessionInterests', {
		required: false,
		array: true,
		size: 36,
	})

	// Create indexes
	await createIndex(ATTENDEES_COLLECTION_ID, 'user_conference_idx', 'unique', [
		'userId',
		'conferenceId',
	])
	await createIndex(ATTENDEES_COLLECTION_ID, 'conference_idx', 'key', [
		'conferenceId',
	])
	await createIndex(ATTENDEES_COLLECTION_ID, 'user_idx', 'key', ['userId'])
	await createIndex(ATTENDEES_COLLECTION_ID, 'status_idx', 'key', ['status'])

	return collection
}

// Setup sessions collection
async function setupSessionsCollection() {
	const collection = await createCollection(
		SESSIONS_COLLECTION_ID,
		'Conference Sessions'
	)

	// Create attributes
	await createAttribute(SESSIONS_COLLECTION_ID, 'string', 'conferenceId', {
		required: true,
		size: 36,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'string', 'title', {
		required: true,
		size: 100,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'string', 'description', {
		required: false,
		size: 5000,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'datetime', 'startTime', {
		required: true,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'datetime', 'endTime', {
		required: true,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'string', 'location', {
		required: false,
		size: 100,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'string', 'speakerIds', {
		required: true,
		array: true,
		size: 36,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'string', 'speakerNames', {
		required: false,
		array: true,
		size: 100,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'integer', 'capacity', {
		required: false,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'integer', 'attendeeCount', {
		required: false,
		default: 0,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'string', 'tags', {
		required: false,
		array: true,
		size: 50,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'string', 'track', {
		required: false,
		size: 50,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'url', 'slidesUrl', {
		required: false,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'url', 'recordingUrl', {
		required: false,
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'enum', 'status', {
		required: false, // Changed to false to allow default value
		elements: ['scheduled', 'in-progress', 'completed', 'cancelled'],
		default: 'scheduled',
	})
	await createAttribute(SESSIONS_COLLECTION_ID, 'enum', 'type', {
		required: false, // Changed to false to allow default value
		elements: ['talk', 'workshop', 'panel', 'networking', 'break', 'other'],
		default: 'talk',
	})

	// Create indexes
	await createIndex(SESSIONS_COLLECTION_ID, 'conference_idx', 'key', [
		'conferenceId',
	])
	await createIndex(SESSIONS_COLLECTION_ID, 'time_idx', 'key', ['startTime'])
	await createIndex(SESSIONS_COLLECTION_ID, 'status_idx', 'key', ['status'])
	await createIndex(SESSIONS_COLLECTION_ID, 'type_idx', 'key', ['type'])

	return collection
}

// Setup speakers collection
async function setupSpeakersCollection() {
	const collection = await createCollection(
		SPEAKERS_COLLECTION_ID,
		'Session Speakers'
	)

	// Create core speaker attributes
	await createAttribute(SPEAKERS_COLLECTION_ID, 'string', 'userId', {
		required: false,
		size: 36,
	})
	await createAttribute(SPEAKERS_COLLECTION_ID, 'string', 'conferenceId', {
		required: true,
		size: 36,
	})
	await createAttribute(SPEAKERS_COLLECTION_ID, 'string', 'name', {
		required: true,
		size: 100,
	})
	await createAttribute(SPEAKERS_COLLECTION_ID, 'string', 'bio', {
		required: false,
		size: 5000,
	})
	await createAttribute(SPEAKERS_COLLECTION_ID, 'string', 'company', {
		required: false,
		size: 100,
	})
	await createAttribute(SPEAKERS_COLLECTION_ID, 'string', 'jobTitle', {
		required: false,
		size: 100,
	})
	await createAttribute(SPEAKERS_COLLECTION_ID, 'email', 'email', {
		required: false,
	})
	await createAttribute(SPEAKERS_COLLECTION_ID, 'boolean', 'featured', {
		required: false,
		default: false,
	})

	// Create indexes
	await createIndex(SPEAKERS_COLLECTION_ID, 'conference_idx', 'key', [
		'conferenceId',
	])
	await createIndex(SPEAKERS_COLLECTION_ID, 'user_idx', 'key', ['userId'])
	await createIndex(SPEAKERS_COLLECTION_ID, 'featured_idx', 'key', ['featured'])

	return collection
}

// Setup speaker details collection (split from speakers to avoid attribute limit)
async function setupSpeakerDetailsCollection() {
	const collection = await createCollection(
		SPEAKER_DETAILS_COLLECTION_ID,
		'Speaker Details'
	)

	// Create extended speaker attributes
	await createAttribute(SPEAKER_DETAILS_COLLECTION_ID, 'string', 'speakerId', {
		required: true,
		size: 36,
	})
	await createAttribute(
		SPEAKER_DETAILS_COLLECTION_ID,
		'string',
		'phoneNumber',
		{ required: false, size: 20 }
	)
	await createAttribute(SPEAKER_DETAILS_COLLECTION_ID, 'url', 'website', {
		required: false,
	})
	await createAttribute(
		SPEAKER_DETAILS_COLLECTION_ID,
		'url',
		'profileImageUrl',
		{ required: false }
	)
	await createAttribute(
		SPEAKER_DETAILS_COLLECTION_ID,
		'string',
		'profileImageFileId',
		{ required: false, size: 36 }
	)
	await createAttribute(SPEAKER_DETAILS_COLLECTION_ID, 'string', 'socialData', {
		required: false,
		size: 5000,
	}) // Stringified JSON
	await createAttribute(SPEAKER_DETAILS_COLLECTION_ID, 'string', 'sessionIds', {
		required: false,
		array: true,
		size: 36,
	})
	await createAttribute(SPEAKER_DETAILS_COLLECTION_ID, 'float', 'rating', {
		required: false,
		min: 0,
		max: 5,
	})

	// Create indexes
	await createIndex(SPEAKER_DETAILS_COLLECTION_ID, 'speaker_idx', 'unique', [
		'speakerId',
	])

	return collection
}

// Setup storage buckets
async function setupStorageBuckets() {
	await createBucket(PROFILE_IMAGES_BUCKET_ID, 'Profile Images')
	await createBucket(CONFERENCE_IMAGES_BUCKET_ID, 'Conference Images')
}

// Main function to run the setup
async function main() {
	try {
		console.log('🚀 Starting Appwrite database setup...')

		// Create the database
		await createDatabase()

		// Setup collections
		await setupProfilesCollection()
		await setupProfileSettingsCollection()
		await setupContactsCollection()
		await setupContactDetailsCollection()
		await setupQRSettingsCollection()
		await setupConferencesCollection()
		await setupConferenceDetailsCollection()
		await setupAttendeesCollection()
		await setupSessionsCollection()
		await setupSpeakersCollection()
		await setupSpeakerDetailsCollection()

		// Setup storage buckets
		await setupStorageBuckets()

		console.log('✅ Database setup completed successfully!')
		console.log('')
		console.log("Here's what was set up:")
		console.log('- Main database')
		console.log('- 11 collections with attributes and indexes')
		console.log('- 2 storage buckets for images')
		console.log('')
		console.log('You can now use your Appwrite database in your application!')
	} catch (error) {
		console.error('❌ Database setup failed:', error)
		process.exit(1)
	}
}

// Run the script
main()
