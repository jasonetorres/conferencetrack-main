export interface Profile {
	name: string // Required in Appwrite schema
	title?: string // Optional in Appwrite schema
	company: string // Required in Appwrite schema
	email: string // Required in Appwrite schema
	phone?: string // Optional in Appwrite schema
	socials: Record<string, string> // Stored as JSON string in Appwrite
	profilePicture?: string // Not in Appwrite schema, handled locally
}
