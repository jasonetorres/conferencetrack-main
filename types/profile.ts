export interface Profile {
	name: string // Required in Appwrite schema
	title?: string // Optional in Appwrite schema
	company: string // Required in Appwrite schema
	email: string // Required in Appwrite schema
	phone?: string // Optional in Appwrite schema
	socials: Record<string, string> // Stored as JSON string in Appwrite
	profilePictureId?: string // ID of the uploaded image in Appwrite storage
	profilePicture?: string // Local representation for UI display, not stored in Appwrite
}
