import { 
  databases,
  ID, 
  Query,
  APPWRITE_DATABASE_ID,
  PROFILES_COLLECTION_ID,
  CONTACTS_COLLECTION_ID,
  QR_SETTINGS_COLLECTION_ID,
  CONFERENCES_COLLECTION_ID,
  ATTENDEES_COLLECTION_ID,
  SESSIONS_COLLECTION_ID,
  SPEAKERS_COLLECTION_ID
} from './appwrite';

import { 
  UserProfile,
  Contact,
  QRSettings,
  Conference,
  Attendee,
  Session,
  Speaker,
  ProfileRecord,
  ContactRecord,
  QRSettingsRecord,
  ConferenceRecord,
  AttendeeRecord,
  SessionRecord,
  SpeakerRecord
} from '@/types/database';

// Error handling helper
const handleError = (error: any, operation: string, collectionId: string, documentId?: string) => {
  const message = documentId
    ? `Error during ${operation} operation on collection ${collectionId} for document ${documentId}`
    : `Error during ${operation} operation on collection ${collectionId}`;
    
  console.error(message, error);
  throw error;
};

// Generic CRUD operations
export const dbHelper = {
  // Create a document
  async create<T>(collectionId: string, data: Omit<T, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>, permissions: string[] = []) {
    try {
      return await databases.createDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        ID.unique(),
        data,
        permissions
      );
    } catch (error) {
      handleError(error, 'create', collectionId);
      throw error;
    }
  },

  // Read a document by ID
  async getById<T>(collectionId: string, documentId: string) {
    try {
      return await databases.getDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        documentId
      ) as T;
    } catch (error) {
      handleError(error, 'getById', collectionId, documentId);
      throw error;
    }
  },

  // List documents with optional queries
  async list<T>(collectionId: string, queries: string[] = []) {
    try {
      return await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        collectionId,
        queries
      ) as { documents: T[], total: number };
    } catch (error) {
      handleError(error, 'list', collectionId);
      throw error;
    }
  },

  // Update a document
  async update<T>(collectionId: string, documentId: string, data: Partial<Omit<T, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>>) {
    try {
      return await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        documentId,
        data
      ) as T;
    } catch (error) {
      handleError(error, 'update', collectionId, documentId);
      throw error;
    }
  },

  // Delete a document
  async delete(collectionId: string, documentId: string) {
    try {
      return await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        documentId
      );
    } catch (error) {
      handleError(error, 'delete', collectionId, documentId);
      throw error;
    }
  }
};

// User Profiles
export const profilesDb = {
  // Create a user profile
  async create(data: Omit<UserProfile, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>, permissions: string[] = []) {
    return dbHelper.create<ProfileRecord>(PROFILES_COLLECTION_ID, data, permissions);
  },

  // Get a user profile by ID
  async getById(profileId: string) {
    return dbHelper.getById<ProfileRecord>(PROFILES_COLLECTION_ID, profileId);
  },

  // Get a user profile by user ID
  async getByUserId(userId: string) {
    try {
      const result = await dbHelper.list<ProfileRecord>(PROFILES_COLLECTION_ID, [
        Query.equal('userId', userId)
      ]);
      return result.documents.length > 0 ? result.documents[0] : null;
    } catch (error) {
      handleError(error, 'getByUserId', PROFILES_COLLECTION_ID);
      throw error;
    }
  },

  // Update a user profile
  async update(profileId: string, data: Partial<Omit<UserProfile, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>>) {
    return dbHelper.update<ProfileRecord>(PROFILES_COLLECTION_ID, profileId, data);
  },

  // Delete a user profile
  async delete(profileId: string) {
    return dbHelper.delete(PROFILES_COLLECTION_ID, profileId);
  },

  // List all profiles (admin only)
  async list(queries: string[] = []) {
    return dbHelper.list<ProfileRecord>(PROFILES_COLLECTION_ID, queries);
  }
};

// Contacts
export const contactsDb = {
  // Create a contact
  async create(data: Omit<Contact, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>, permissions: string[] = []) {
    return dbHelper.create<ContactRecord>(CONTACTS_COLLECTION_ID, data, permissions);
  },

  // Get a contact by ID
  async getById(contactId: string) {
    return dbHelper.getById<ContactRecord>(CONTACTS_COLLECTION_ID, contactId);
  },

  // List contacts for a user
  async listByUserId(userId: string, queries: string[] = []) {
    try {
      return await dbHelper.list<ContactRecord>(CONTACTS_COLLECTION_ID, [
        Query.equal('userId', userId),
        ...queries
      ]);
    } catch (error) {
      handleError(error, 'listByUserId', CONTACTS_COLLECTION_ID);
      throw error;
    }
  },

  // Update a contact
  async update(contactId: string, data: Partial<Omit<Contact, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>>) {
    return dbHelper.update<ContactRecord>(CONTACTS_COLLECTION_ID, contactId, data);
  },

  // Delete a contact
  async delete(contactId: string) {
    return dbHelper.delete(CONTACTS_COLLECTION_ID, contactId);
  }
};

// QR Settings
export const qrSettingsDb = {
  // Create QR settings
  async create(data: Omit<QRSettings, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>, permissions: string[] = []) {
    return dbHelper.create<QRSettingsRecord>(QR_SETTINGS_COLLECTION_ID, data, permissions);
  },

  // Get QR settings by ID
  async getById(settingsId: string) {
    return dbHelper.getById<QRSettingsRecord>(QR_SETTINGS_COLLECTION_ID, settingsId);
  },

  // Get QR settings by user ID
  async getByUserId(userId: string) {
    try {
      const result = await dbHelper.list<QRSettingsRecord>(QR_SETTINGS_COLLECTION_ID, [
        Query.equal('userId', userId)
      ]);
      return result.documents.length > 0 ? result.documents[0] : null;
    } catch (error) {
      handleError(error, 'getByUserId', QR_SETTINGS_COLLECTION_ID);
      throw error;
    }
  },

  // Update QR settings
  async update(settingsId: string, data: Partial<Omit<QRSettings, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>>) {
    return dbHelper.update<QRSettingsRecord>(QR_SETTINGS_COLLECTION_ID, settingsId, data);
  },

  // Delete QR settings
  async delete(settingsId: string) {
    return dbHelper.delete(QR_SETTINGS_COLLECTION_ID, settingsId);
  }
};

// Conferences
export const conferencesDb = {
  // Create a conference
  async create(data: Omit<Conference, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>, permissions: string[] = []) {
    return dbHelper.create<ConferenceRecord>(CONFERENCES_COLLECTION_ID, data, permissions);
  },

  // Get a conference by ID
  async getById(conferenceId: string) {
    return dbHelper.getById<ConferenceRecord>(CONFERENCES_COLLECTION_ID, conferenceId);
  },

  // List conferences
  async list(queries: string[] = []) {
    return dbHelper.list<ConferenceRecord>(CONFERENCES_COLLECTION_ID, queries);
  },

  // List conferences by organizer
  async listByOrganizer(organizerId: string, queries: string[] = []) {
    try {
      return await dbHelper.list<ConferenceRecord>(CONFERENCES_COLLECTION_ID, [
        Query.equal('organizerId', organizerId),
        ...queries
      ]);
    } catch (error) {
      handleError(error, 'listByOrganizer', CONFERENCES_COLLECTION_ID);
      throw error;
    }
  },

  // List public conferences
  async listPublic(queries: string[] = []) {
    try {
      return await dbHelper.list<ConferenceRecord>(CONFERENCES_COLLECTION_ID, [
        Query.equal('isPublic', true),
        ...queries
      ]);
    } catch (error) {
      handleError(error, 'listPublic', CONFERENCES_COLLECTION_ID);
      throw error;
    }
  },

  // Update a conference
  async update(conferenceId: string, data: Partial<Omit<Conference, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>>) {
    return dbHelper.update<ConferenceRecord>(CONFERENCES_COLLECTION_ID, conferenceId, data);
  },

  // Delete a conference
  async delete(conferenceId: string) {
    return dbHelper.delete(CONFERENCES_COLLECTION_ID, conferenceId);
  }
};

// Attendees
export const attendeesDb = {
  // Create an attendee
  async create(data: Omit<Attendee, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>, permissions: string[] = []) {
    return dbHelper.create<AttendeeRecord>(ATTENDEES_COLLECTION_ID, data, permissions);
  },

  // Get an attendee by ID
  async getById(attendeeId: string) {
    return dbHelper.getById<AttendeeRecord>(ATTENDEES_COLLECTION_ID, attendeeId);
  },

  // List attendees for a conference
  async listByConference(conferenceId: string, queries: string[] = []) {
    try {
      return await dbHelper.list<AttendeeRecord>(ATTENDEES_COLLECTION_ID, [
        Query.equal('conferenceId', conferenceId),
        ...queries
      ]);
    } catch (error) {
      handleError(error, 'listByConference', ATTENDEES_COLLECTION_ID);
      throw error;
    }
  },

  // Get attendee by user and conference
  async getByUserAndConference(userId: string, conferenceId: string) {
    try {
      const result = await dbHelper.list<AttendeeRecord>(ATTENDEES_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.equal('conferenceId', conferenceId)
      ]);
      return result.documents.length > 0 ? result.documents[0] : null;
    } catch (error) {
      handleError(error, 'getByUserAndConference', ATTENDEES_COLLECTION_ID);
      throw error;
    }
  },

  // List conferences a user is attending
  async listUserConferences(userId: string, queries: string[] = []) {
    try {
      return await dbHelper.list<AttendeeRecord>(ATTENDEES_COLLECTION_ID, [
        Query.equal('userId', userId),
        ...queries
      ]);
    } catch (error) {
      handleError(error, 'listUserConferences', ATTENDEES_COLLECTION_ID);
      throw error;
    }
  },

  // Update an attendee
  async update(attendeeId: string, data: Partial<Omit<Attendee, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>>) {
    return dbHelper.update<AttendeeRecord>(ATTENDEES_COLLECTION_ID, attendeeId, data);
  },

  // Delete an attendee
  async delete(attendeeId: string) {
    return dbHelper.delete(ATTENDEES_COLLECTION_ID, attendeeId);
  }
};

// Sessions
export const sessionsDb = {
  // Create a session
  async create(data: Omit<Session, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>, permissions: string[] = []) {
    return dbHelper.create<SessionRecord>(SESSIONS_COLLECTION_ID, data, permissions);
  },

  // Get a session by ID
  async getById(sessionId: string) {
    return dbHelper.getById<SessionRecord>(SESSIONS_COLLECTION_ID, sessionId);
  },

  // List sessions for a conference
  async listByConference(conferenceId: string, queries: string[] = []) {
    try {
      return await dbHelper.list<SessionRecord>(SESSIONS_COLLECTION_ID, [
        Query.equal('conferenceId', conferenceId),
        ...queries
      ]);
    } catch (error) {
      handleError(error, 'listByConference', SESSIONS_COLLECTION_ID);
      throw error;
    }
  },

  // List sessions by speaker
  async listBySpeaker(speakerId: string, queries: string[] = []) {
    try {
      return await dbHelper.list<SessionRecord>(SESSIONS_COLLECTION_ID, [
        Query.search('speakerIds', speakerId),
        ...queries
      ]);
    } catch (error) {
      handleError(error, 'listBySpeaker', SESSIONS_COLLECTION_ID);
      throw error;
    }
  },

  // Update a session
  async update(sessionId: string, data: Partial<Omit<Session, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>>) {
    return dbHelper.update<SessionRecord>(SESSIONS_COLLECTION_ID, sessionId, data);
  },

  // Delete a session
  async delete(sessionId: string) {
    return dbHelper.delete(SESSIONS_COLLECTION_ID, sessionId);
  }
};

// Speakers
export const speakersDb = {
  // Create a speaker
  async create(data: Omit<Speaker, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>, permissions: string[] = []) {
    return dbHelper.create<SpeakerRecord>(SPEAKERS_COLLECTION_ID, data, permissions);
  },

  // Get a speaker by ID
  async getById(speakerId: string) {
    return dbHelper.getById<SpeakerRecord>(SPEAKERS_COLLECTION_ID, speakerId);
  },

  // List speakers for a conference
  async listByConference(conferenceId: string, queries: string[] = []) {
    try {
      return await dbHelper.list<SpeakerRecord>(SPEAKERS_COLLECTION_ID, [
        Query.equal('conferenceId', conferenceId),
        ...queries
      ]);
    } catch (error) {
      handleError(error, 'listByConference', SPEAKERS_COLLECTION_ID);
      throw error;
    }
  },

  // Get speaker by user ID
  async getByUserId(userId: string, conferenceId?: string) {
    try {
      const queries = [Query.equal('userId', userId)];
      
      if (conferenceId) {
        queries.push(Query.equal('conferenceId', conferenceId));
      }
      
      const result = await dbHelper.list<SpeakerRecord>(SPEAKERS_COLLECTION_ID, queries);
      return result.documents.length > 0 ? result.documents[0] : null;
    } catch (error) {
      handleError(error, 'getByUserId', SPEAKERS_COLLECTION_ID);
      throw error;
    }
  },

  // Update a speaker
  async update(speakerId: string, data: Partial<Omit<Speaker, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>>) {
    return dbHelper.update<SpeakerRecord>(SPEAKERS_COLLECTION_ID, speakerId, data);
  },

  // Delete a speaker
  async delete(speakerId: string) {
    return dbHelper.delete(SPEAKERS_COLLECTION_ID, speakerId);
  }
};

