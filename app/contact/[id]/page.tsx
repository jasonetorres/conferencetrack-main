"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Pencil, Trash2, Mail, Phone, Building, Briefcase } from "lucide-react"
import { ContactsProvider, useContacts } from "@/hooks/use-contacts"
import type { Contact } from "@/types/contact" // Import the Contact type
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"



function ContactDetailContent({ params }: { params: { id: string } }) {
  const router = useRouter()
  // Assuming useContacts provides `contacts` where each contact object includes Appwrite's `$id`
  const { contacts, updateContact, deleteContact } = useContacts()
  const [contact, setContact] = useState<Contact | null>(null)
  const [editedContact, setEditedContact] = useState<Contact | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // `params.id` is the dynamic segment from the URL (e.g., the contact's Appwrite $id)
  const contactId = params.id;

  useEffect(() => {
    // Find the contact in the local state by its Appwrite $id
    // It's essential that `contacts` array contains objects with `$id` properties.
    const foundContact = contacts.find((c) => c.$id === contactId); // Use c.$id here
    if (foundContact) {
      setContact(foundContact);
      setEditedContact(foundContact);
    } else {
      // If contact not found in local `contacts` array (e.g., after a refresh, or if array is empty initially)
      // you might want to fetch it directly from Appwrite here using `databases.getDocument`.
      // For now, if not found, it redirects to the home page.
      if (!contacts.length && contactId) { // Check if contacts array is empty AND we have an ID to search for
        // OPTIONAL: Implement a fetch from DB here if the contact isn't in local state.
        // Requires importing `databases` from appwrite and `isLoading` from useContacts
        // to manage the state. Example:
        /*
        const fetchContactFromDB = async () => {
          try {
            const fetched = await databases.getDocument<Contact>(CONTACTS_COLLECTION_ID, contactId);
            setContact(fetched);
            setEditedContact(fetched);
          } catch (err) {
            console.error("Failed to fetch contact directly from DB:", err);
            router.push("/"); // Redirect if not found in DB
          }
        };
        fetchContactFromDB();
        */
        // If not fetching from DB, and contacts is empty, and it's not loading, redirect.
        // For simplicity, sticking to original behavior (redirects if not found in local state).
        router.push("/");
      } else if (!foundContact && !contacts.length) { // Only redirect if contacts is loaded and still no contact
          router.push("/");
      }
    }
  }, [contacts, contactId, router]); // Depend on contactId

  if (!contact) {
    // Show a loading indicator while `contact` is null (before data is fetched or redirect occurs)
    return (
      <div className="container mx-auto px-4 py-6 max-w-md">
        <p>Loading contact details...</p> {/* Or a spinner */}
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditedContact((prev) => {
      if (!prev) return null; // Should not happen if `editedContact` is initialized correctly
      return { ...prev, [name]: value };
    });
  }

  const handleSave = () => {
    if (editedContact) {
      // Ensure the ID passed to updateContact is the Appwrite document ID ($id)
      // The updateContact function in use-contacts expects Partial<Omit<Contact, "user_id">> & { $id: string }
      updateContact({ ...editedContact, $id: editedContact.$id }); // Pass $id explicitly
      setContact(editedContact); // Update local state with saved changes
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    // Pass the Appwrite $id for deletion
    deleteContact(contact.$id); // Use contact.$id here
    router.push("/"); // Redirect after deletion
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="mr-2" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Contact Details</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsEditing(true)} aria-label="Edit contact">
            <Pencil className="h-4 w-4" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon" aria-label="Delete contact">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Contact</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete {contact.name}'s contact information.
                </DialogDescription>
              </DialogHeader>
              <p>Are you sure you want to delete {contact.name}? This action cannot be undone.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditing(false)}> {/* Corrected onClick for Cancel */}
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{contact.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(contact.title || contact.company) && (
            <div className="flex items-start gap-2">
              {contact.title && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.title}</span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.company}</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {(contact.email || contact.phone) && (
            <div className="space-y-2">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
            </div>
          )}

          {contact.socials && Object.keys(contact.socials).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Social Media</h3>
                {Object.entries(contact.socials).map(([platform, url]) => (
                  <div key={platform} className="flex items-center gap-2">
                    <span className="text-sm capitalize">{platform}:</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate"
                    >
                      {url}
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}

          {contact.metAt && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium">Met At</h3>
                <p className="text-sm">
                  {contact.metAt} on {new Date(contact.date).toLocaleDateString()}
                </p>
              </div>
            </>
          )}

          {contact.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium">Notes</h3>
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update the contact details below. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          {editedContact && (
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={editedContact.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={editedContact.title || ""}
                  onChange={handleInputChange}
                  placeholder="Software Engineer"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  name="company"
                  value={editedContact.company || ""}
                  onChange={handleInputChange}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={editedContact.email || ""}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={editedContact.phone || ""}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="metAt">Met At</Label>
                <Input
                  id="metAt"
                  name="metAt"
                  value={editedContact.metAt || ""}
                  onChange={handleInputChange}
                  placeholder="TechConf 2023"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={editedContact.notes || ""}
                  onChange={handleInputChange}
                  placeholder="We discussed collaboration opportunities..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// This is the default export for app/contact/[id]/page.tsx
export default function ContactDetailPage({ params }: { params: { id: string } }) {
  // The warning "A param property was accessed directly with `params.id`..."
  // is actually referring to params.id being accessed *within* ContactDetailContent.
  // By passing params.id directly, Next.js handles the Promise resolution for client components.
  // The warning is more of a forward compatibility note for server components or React.use().
  // For this client component setup, params.id will be a string after hydration.
  return (
    <ContactsProvider>
      <ContactDetailContent params={params} />
    </ContactsProvider>
  )
}