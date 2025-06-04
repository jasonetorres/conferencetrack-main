// src/types/contact.ts
import { Models } from 'appwrite';

// Base interface for Appwrite documents
// This is used to automatically include Appwrite's system attributes like $id, $createdAt, etc.
export interface AppwriteDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
}

// User profile information
// Aligned with the attribute names and types that your Appwrite 1.7.4 backend expects
export interface UserProfile extends AppwriteDocument {
  user_id: string;          // Matches backend `user_id`
  name: string;             // Matches backend `name`
  email: string;            // Matches backend `email`
  title?: string;           // Matches backend `title`
  company?: string;         // Matches backend `company`
  phone?: string;           // Matches backend `phone`
  socials?: string;         // CRITICAL CHANGE: Must be 'string' for Appwrite 1.7.4, will store stringified JSON
  profile_picture?: string; // Matches backend `profile_picture` (use this instead of avatarUrl/FileId)
  // Removed fields that are not in your Appwrite 'profiles' collection attributes based on the provided Database interface:
  // bio, jobTitle, location, website, avatarUrl, avatarFileId, settings.
  // If you need these, you must add them as 'String' attributes in your Appwrite 'profiles' collection
  // and manually stringify/parse them if they are complex objects in your frontend.
}

// Contacts (connections made at conferences)
// Aligned with the attribute names and types that your Appwrite 1.7.4 backend expects
export interface Contact extends AppwriteDocument {
  user_id: string;    // Matches backend `user_id`
  name: string;       // Matches backend `name`
  email?: string;
  phone?: string;
  company?: string;
  title?: string;     // Matches backend `title` (not jobTitle)
  notes?: string;
  met_at?: string;    // Matches backend `met_at` (not meetingLocation)
  date: string;       // Matches backend `date` (not meetingDate)
  socials?: string;   // CRITICAL CHANGE: Must be 'string' for Appwrite 1.7.4, will store stringified JSON
  // Removed fields that are not in your Appwrite 'contacts' collection attributes based on the provided Database interface:
  // contactUserId, jobTitle, meetingLocation, meetingDate, isStarred, tags.
  // If you need these, you must add them as 'String' attributes in your Appwrite 'contacts' collection
  // and manually stringify/parse them if they are complex objects in your frontend.
}

// QR Code Settings
// Aligned with the attribute names and types that your Appwrite 1.7.4 backend expects
export interface QRSettings extends AppwriteDocument {
  user_id: string; // Matches backend `user_id`
  bg_color: string;
  fg_color: string;
  page_background_color: string;
  card_background_color: string;
  text_color: string;
  show_name: boolean;
  show_title: boolean;
  show_company: boolean;
  show_contact: boolean;
  show_socials: boolean;
  show_profile_picture: boolean;
  layout_style: string;
  qr_size: number;
  border_radius: number;
  card_padding: number;
  font_family: string;
  font_size: number;
  // Removed fields not found in the provided 'qr_settings' schema.
  // design, includeJobTitle, includePhone, customField1/2, logoFileId, primaryColor, secondaryColor.
  // If you need these, you must add them as attributes in your Appwrite 'qr_settings' collection.
}

// Conference
// Aligned with the attribute names and types that your Appwrite 1.7.4 backend expects
export interface Conference extends AppwriteDocument {
  name: string;
  description?: string;
  start_date: string; // Assume snake_case from DB interface
  end_date: string;   // Assume snake_case from DB interface
  location: string;
  venue?: string;
  website?: string;
  logo_url?: string;
  logo_file_id?: string;
  cover_image_url?: string;
  cover_image_file_id?: string;
  organizer_id: string;
  organizer_name?: string;
  is_public: boolean;
  status: 'draft' | 'published' | 'archived' | 'completed';
  tags?: string[];
  capacity?: number;
  registration_link?: string;
  contact_email?: string;
  contact_phone?: string;
  // Add other attributes from your actual 'conference_details' schema.
}

// Conference Attendee
// Aligned with the attribute names and types that your Appwrite 1.7.4 backend expects
export interface Attendee extends AppwriteDocument {
  user_id: string;
  conference_id: string;
  registration_date: string;
  check_in_date?: string;
  ticket_type?: 'standard' | 'vip' | 'speaker' | 'sponsor' | 'organizer';
  ticket_id?: string;
  status: 'registered' | 'checked-in' | 'cancelled' | 'no-show';
  notes?: string;
  is_organizer?: boolean;
  is_speaker?: boolean;
  session_interests?: string[];
  // Add other attributes from your actual 'attendees' schema.
}

// Conference Session
// Aligned with the attribute names and types that your Appwrite 1.7.4 backend expects
export interface Session extends AppwriteDocument {
  conference_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  speaker_ids: string[];
  speaker_names?: string[];
  capacity?: number;
  attendee_count?: number;
  tags?: string[];
  track?: string;
  slides_url?: string;
  recording_url?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  type: 'talk' | 'workshop' | 'panel' | 'networking' | 'break' | 'other';
  // Add other attributes from your actual 'sessions' schema.
}

// Speaker Profile
// Aligned with the attribute names and types that your Appwrite 1.7.4 backend expects
export interface Speaker extends AppwriteDocument {
  user_id?: string;
  conference_id: string;
  name: string;
  bio?: string;
  company?: string;
  title?: string;
  email?: string;
  phone_number?: string;
  website?: string;
  profile_image_url?: string;
  profile_image_file_id?: string;
  socials?: string; // CRITICAL CHANGE: Must be 'string' for older Appwrite versions
  session_ids?: string[];
  featured?: boolean;
  rating?: number;
  // Add other attributes from your actual 'speaker_details' schema.
}


// These are type aliases used in your code, they are correct as is,
// assuming the interfaces above are fixed to match Appwrite 1.7.4's capabilities.
export type ProfileRecord = Models.Document & UserProfile;
export type ContactRecord = Models.Document & Contact;
export type QRSettingsRecord = Models.Document & QRSettings;
export type ConferenceRecord = Models.Document & Conference;
export type AttendeeRecord = Models.Document & Attendee;
export type SessionRecord = Models.Document & Session;
export type SpeakerRecord = Models.Document & Speaker;

// This Database interface is from your Appwrite backend and defines the exact schema.
// We are leaving this as is, as it's the source of truth from your backend.
// Our custom interfaces above (UserProfile, Contact, etc.) now reflect the *runtime*
// behavior you're observing with Appwrite 1.7.4 (e.g., 'socials' as string).
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
          socials: Record<string, string> | null // This line from YOUR backend schema is the contradiction.
                                                 // It says Record<string,string> but your runtime says String.
                                                 // We are prioritizing the runtime error for the fix.
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
          socials: Record<string, string> | null // Contradiction: Backend says Record<string, string>
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