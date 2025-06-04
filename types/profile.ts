export interface Profile {
  name: string
  title?: string
  company?: string
  email?: string
  phone?: string
  socials: Record<string, string>
  profilePicture?: string
}
