// hooks/use-contacts.tsx

"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import {
  databaseService as databases,
  ID,
  Query,
  APPWRITE_DATABASE_ID,
  CONTACTS_COLLECTION_ID,
} from "@/lib/appwrite"
import { Models, Permission, Role } from "appwrite"
import type { Contact } from "@/types/contact" // Import the shared Contact interface


type NewContactData = Omit<Contact, '$id' | '$createdAt' | '$updatedAt' | '$collectionId' | '$databaseId' | '$permissions' | 'user_id'>;


type ContactsContextType = {
  contacts: Contact[]
  addContact: (newContactData: NewContactData) => Promise<void>
  updateContact: (updatedContactData: Partial<Omit<Contact, "user_id">> & { $id: string }) => Promise<void>
  deleteContact: (documentId: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined)

export function ContactsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth() as { user: Models.User<Models.Preferences> | null | undefined }
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const appwriteUserId = user?.$id

  useEffect(() => {
    const loadContacts = async () => {
      setIsLoading(true)
      setError(null)

      const savedContacts = localStorage.getItem("contacts")
      if (savedContacts) {
        try {
          const parsed = JSON.parse(savedContacts) as Contact[]
          setContacts(parsed)
        } catch (e) {
          console.error("Failed to parse contacts from localStorage", e)
          localStorage.removeItem("contacts")
        }
      }

      if (appwriteUserId) {
        try {
          const response = await databases.listDocuments<Contact>(
            CONTACTS_COLLECTION_ID,
            [
              Query.equal("user_id", appwriteUserId),
              Query.orderDesc("$createdAt"),
            ]
          )
          setContacts(response.documents)
          localStorage.setItem("contacts", JSON.stringify(response.documents))
        } catch (e: any) {
          console.error("Appwrite: Failed to fetch contacts", e)
          setError("Failed to load contacts from database. Using local data if available.")
        }
      }
      setIsLoading(false)
    }

    loadContacts()
  }, [appwriteUserId])

  const addContact = async (newContactData: NewContactData) => {
    if (!appwriteUserId) {
      setError("User not authenticated. Contact saved locally only.")
      console.warn("User not authenticated, cannot save contact to Appwrite.")

      const optimisticContact: Contact = {
        ...newContactData, // This spread now includes all non-omitted fields like 'name', 'date', etc.
        $id: `local-${Date.now().toString()}`, // Temporary local ID
        user_id: "local-placeholder", // Placeholder for local storage
        $collectionId: CONTACTS_COLLECTION_ID,
        $databaseId: APPWRITE_DATABASE_ID,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        $permissions: [],
      }
      const updatedContacts = [optimisticContact, ...contacts]
      setContacts(updatedContacts)
      localStorage.setItem("contacts", JSON.stringify(updatedContacts))
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const payload = {
        ...newContactData, // This spread includes 'name', 'date', etc.
        user_id: appwriteUserId, // Explicitly add user_id for the database
      } as Omit<Contact, keyof Models.Document>; // Cast to ensure it matches Appwrite's expected payload type

      const response = await databases.createDocument<Contact>(
        CONTACTS_COLLECTION_ID,
        payload,
        [
          Permission.read(Role.user(appwriteUserId)),
          Permission.update(Role.user(appwriteUserId)),
          Permission.delete(Role.user(appwriteUserId)),
        ]
      )
      const updatedContactsList = [response, ...contacts]
      setContacts(updatedContactsList)
      localStorage.setItem("contacts", JSON.stringify(updatedContactsList))
    } catch (e: any) {
      console.error("Appwrite: Failed to add contact", e)
      setError("Failed to save contact to database. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateContact = async (updatedContactData: Partial<Omit<Contact, "user_id">> & { $id: string }) => {
    if (!appwriteUserId) {
      setError("User not authenticated. Contact update failed.")
      console.warn("User not authenticated, cannot update contact in Appwrite.")
      const updatedContacts = contacts.map((contact) =>
        contact.$id === updatedContactData.$id ? { ...contact, ...updatedContactData } as Contact : contact
      )
      setContacts(updatedContacts)
      localStorage.setItem("contacts", JSON.stringify(updatedContacts))
      return
    }

    setIsLoading(true)
    setError(null)
    const { $id, ...payload } = updatedContactData
    const originalContacts = [...contacts]
    setContacts((prevContacts) =>
      prevContacts.map((c) => (c.$id === $id ? ({ ...c, ...payload } as Contact) : c))
    )

    try {
      const dataToUpdate = { ...payload } as Partial<Omit<Contact, keyof Models.Document>>;

      const response = await databases.updateDocument<Contact>(
        CONTACTS_COLLECTION_ID,
        $id,
        dataToUpdate
      )
      setContacts((prevContacts) =>
        prevContacts.map((c) => (c.$id === response.$id ? response : c))
      )
      localStorage.setItem("contacts", JSON.stringify(contacts.map((c) => (c.$id === response.$id ? response : c))))
    } catch (e: any) {
      console.error("Appwrite: Failed to update contact", e)
      setError("Failed to update contact in database. Reverting local changes.")
      setContacts(originalContacts)
      localStorage.setItem("contacts", JSON.stringify(originalContacts))
    } finally {
      setIsLoading(false)
    }
  }

  const deleteContact = async (documentId: string) => {
    if (!appwriteUserId) {
      setError("User not authenticated. Contact deletion failed.")
      console.warn("User not authenticated, cannot delete contact in Appwrite.")
      const updatedContacts = contacts.filter((contact) => contact.$id !== documentId)
      setContacts(updatedContacts)
      localStorage.setItem("contacts", JSON.stringify(updatedContacts))
      return
    }

    setIsLoading(true)
    setError(null)
    const originalContacts = [...contacts]
    setContacts((prevContacts) => prevContacts.filter((contact) => contact.$id !== documentId))

    try {
      await databases.deleteDocument(CONTACTS_COLLECTION_ID, documentId)
      localStorage.setItem("contacts", JSON.stringify(contacts.filter((contact) => contact.$id !== documentId)))
    } catch (e: any) {
      console.error("Appwrite: Failed to delete contact", e)
      setError("Failed to delete contact from database. Reverting local changes.")
      setContacts(originalContacts)
      localStorage.setItem("contacts", JSON.stringify(originalContacts))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ContactsContext.Provider value={{ contacts, addContact, updateContact, deleteContact, isLoading, error }}>
      {children}
    </ContactsContext.Provider>
  )
}

export function useContacts() {
  const context = useContext(ContactsContext)
  if (context === undefined) {
    throw new Error("useContacts must be used within a ContactsProvider")
  }
  return context
}