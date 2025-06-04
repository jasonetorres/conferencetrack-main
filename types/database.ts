import { Models } from 'appwrite';

// Base interface with common fields from Appwrite documents
export interface AppwriteDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
}

// User profile information
export interface UserProfile extends AppwriteDocument {
  userId: string; // Appwrite User ID
  name: string;
  email: string;
  bio?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  phoneNumber?: string;
  website?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
  };
  avatarUrl?: string;
  avatarFileId?: string; // Reference to Storage file
  settings?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
}

// Contacts (connections made at conferences)
export interface Contact extends AppwriteDocument {
  userId: string; // User who owns this contact
  contactUserId?: string; // If the contact is also a user in the system
  name: string;
  email?: string;
  phoneNumber?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  conferenceId?: string; // Where the contact was made
  meetingLocation?: string;
  meetingDate?: string;
  isStarred?: boolean;
  tags?: string[];
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
  };
}

// QR Code Settings
export interface QRSettings extends AppwriteDocument {
  userId: string;
  design: 'basic' | 'profile' | 'minimal' | 'branded';
  includeName: boolean;
  includeEmail: boolean;
  includeCompany: boolean;
  includeJobTitle: boolean;
  includePhone: boolean;
  includeSocial: boolean;
  customField1Label?: string;
  customField1Value?: string;
  customField2Label?: string;
  customField2Value?: string;
  logoFileId?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

// Conference
export interface Conference extends AppwriteDocument {
  name: string;
  description?: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  location: string;
  venue?: string;
  website?: string;
  logoUrl?: string;
  logoFileId?: string; // Reference to Storage file
  coverImageUrl?: string;
  coverImageFileId?: string; // Reference to Storage file
  organizerId: string; // User who created the conference
  organizerName?: string;
  isPublic: boolean;
  status: 'draft' | 'published' | 'archived' | 'completed';
  tags?: string[];
  capacity?: number;
  registrationLink?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Conference Attendee
export interface Attendee extends AppwriteDocument {
  userId: string; // User ID of the attendee
  conferenceId: string; // Conference being attended
  registrationDate: string; // ISO date string
  checkInDate?: string; // ISO date string when they checked in
  ticketType?: 'standard' | 'vip' | 'speaker' | 'sponsor' | 'organizer';
  ticketId?: string;
  status: 'registered' | 'checked-in' | 'cancelled' | 'no-show';
  notes?: string;
  isOrganizer?: boolean;
  isSpeaker?: boolean;
  sessionInterests?: string[]; // Array of session IDs they're interested in
}

// Conference Session
export interface Session extends AppwriteDocument {
  conferenceId: string;
  title: string;
  description?: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  location?: string; // Room or area within venue
  speakerIds: string[]; // Array of speaker IDs
  speakerNames?: string[]; // Denormalized for faster queries
  capacity?: number;
  attendeeCount?: number;
  tags?: string[];
  track?: string; // Category or track
  slidesUrl?: string;
  recordingUrl?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  type: 'talk' | 'workshop' | 'panel' | 'networking' | 'break' | 'other';
}

// Speaker Profile
export interface Speaker extends AppwriteDocument {
  userId?: string; // May be linked to a user account
  conferenceId: string; // Associated conference
  name: string;
  bio?: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phoneNumber?: string;
  website?: string;
  profileImageUrl?: string;
  profileImageFileId?: string; // Reference to Storage file
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
  };
  sessionIds?: string[]; // Sessions they're speaking at
  featured?: boolean;
  rating?: number; // Average rating from attendees
}

// Types for Appwrite queries
export type ProfileRecord = Models.Document & UserProfile;
export type ContactRecord = Models.Document & Contact;
export type QRSettingsRecord = Models.Document & QRSettings;
export type ConferenceRecord = Models.Document & Conference;
export type AttendeeRecord = Models.Document & Attendee;
export type SessionRecord = Models.Document & Session;
export type SpeakerRecord = Models.Document & Speaker;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string | null
          title: string | null
          company: string | null
          email: string | null
          phone: string | null
          profile_picture: string | null
          socials: Record<string, string> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string | null
          title?: string | null
          company?: string | null
          email?: string | null
          phone?: string | null
          profile_picture?: string | null
          socials?: Record<string, string> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string | null
          title?: string | null
          company?: string | null
          email?: string | null
          phone?: string | null
          profile_picture?: string | null
          socials?: Record<string, string> | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          title: string | null
          company: string | null
          email: string | null
          phone: string | null
          notes: string | null
          met_at: string | null
          date: string
          socials: Record<string, string> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          title?: string | null
          company?: string | null
          email?: string | null
          phone?: string | null
          notes?: string | null
          met_at?: string | null
          date: string
          socials?: Record<string, string> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          title?: string | null
          company?: string | null
          email?: string | null
          phone?: string | null
          notes?: string | null
          met_at?: string | null
          date?: string
          socials?: Record<string, string> | null
          created_at?: string
          updated_at?: string
        }
      }
      qr_settings: {
        Row: {
          id: string
          user_id: string
          bg_color: string
          fg_color: string
          page_background_color: string
          card_background_color: string
          text_color: string
          show_name: boolean
          show_title: boolean
          show_company: boolean
          show_contact: boolean
          show_socials: boolean
          show_profile_picture: boolean
          layout_style: string
          qr_size: number
          border_radius: number
          card_padding: number
          font_family: string
          font_size: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bg_color?: string
          fg_color?: string
          page_background_color?: string
          card_background_color?: string
          text_color?: string
          show_name?: boolean
          show_title?: boolean
          show_company?: boolean
          show_contact?: boolean
          show_socials?: boolean
          show_profile_picture?: boolean
          layout_style?: string
          qr_size?: number
          border_radius?: number
          card_padding?: number
          font_family?: string
          font_size?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bg_color?: string
          fg_color?: string
          page_background_color?: string
          card_background_color?: string
          text_color?: string
          show_name?: boolean
          show_title?: boolean
          show_company?: boolean
          show_contact?: boolean
          show_socials?: boolean
          show_profile_picture?: boolean
          layout_style?: string
          qr_size?: number
          border_radius?: number
          card_padding?: number
          font_family?: string
          font_size?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
