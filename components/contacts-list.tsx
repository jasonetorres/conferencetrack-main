import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Scan, Search, UserPlus, SortAsc, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useContacts } from "@/hooks/use-contacts"
import type { Contact } from "@/types/contact" // Assuming Contact interface includes $id from Models.Document
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import InfiniteScroll from "react-infinite-scroll-component"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

const ITEMS_PER_PAGE = 20

export default function ContactsList() {
  const router = useRouter()
  const { contacts, addContact, deleteContact } = useContacts()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "name" | "company">("date")
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: "",
    title: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
    metAt: "",
    date: new Date().toISOString(),

  })

  type SortKey = "date" | "name" | "company";

  const sortedContacts = [...contacts].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "company":
        return (a.company || "").localeCompare(b.company || "");
      case "date":
      default:
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
    }
  });

  const filteredAndSortedContacts = sortedContacts.filter(
    (contact) =>
      (contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.notes?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayedContacts = filteredAndSortedContacts.slice(0, page * ITEMS_PER_PAGE)
  const hasMore = displayedContacts.length < filteredAndSortedContacts.length

  const handleAddContact = () => {
    if (!newContact.name) {
      toast.error("Contact name is required.");
      return;
    }
    
    const contactPayload = {
      name: newContact.name,
      title: newContact.title || "",
      company: newContact.company || "",
      email: newContact.email || "",
      phone: newContact.phone || "",
      notes: newContact.notes || "",
      metAt: newContact.metAt || "",
      date: newContact.date || new Date().toISOString(),
    };

    addContact(contactPayload); // Pass the plain object, use-contacts will handle user_id and $id

    setNewContact({
      name: "",
      title: "",
      company: "",
      email: "",
      phone: "",
      notes: "",
      metAt: "",
      date: new Date().toISOString(),
    });
    setIsAddingContact(false);
    toast.success("Contact added successfully!");
  };

  const handleDeleteSelected = () => {
    if (selectedContacts.length === 0) return;
    selectedContacts.forEach((id) => deleteContact(id)) // IDs here are expected to be Appwrite $id
    setSelectedContacts([])
    toast.success(`${selectedContacts.length} contact(s) deleted`)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewContact((prev) => ({ ...prev, [name]: value }))
  }

  const toggleContactSelection = (id: string) => { // ID here is expected to be Appwrite $id
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((contactId) => contactId !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Contacts</h2>
        <div className="flex gap-2">
          {selectedContacts.length > 0 && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDeleteSelected}
              aria-label="Delete Selected"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsAddingContact(true)}
            aria-label="Add Contact Manually"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button variant="default" size="icon" onClick={() => router.push("/scan")} aria-label="Scan QR Code">
            <Scan className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortKey)}>
          <SelectTrigger className="w-[140px]">
            <SortAsc className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date Added</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="company">Company</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]" id="scrollableDiv">
        <InfiniteScroll
          dataLength={displayedContacts.length}
          next={() => setPage((p) => p + 1)}
          hasMore={hasMore}
          loader={<div className="text-center py-4">Loading more contacts...</div>}
          scrollableTarget="scrollableDiv"
          endMessage={<p className="text-center py-4 text-muted-foreground">You've seen all contacts!</p>}
        >
          <AnimatePresence>
            {displayedContacts.length > 0 ? (
              <div className="space-y-3">
                {displayedContacts.map((contact, index) => (
                  <motion.div
                    key={contact.$id} // Using Appwrite's $id for React key
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedContacts.includes(contact.$id) ? "border-primary" : "" // Using $id for selection
                      }`}
                      onClick={() => router.push(`/contact/${contact.$id}`)} // Using $id for routing
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.$id)} // Using $id for checkbox
                          onChange={() => toggleContactSelection(contact.$id)} // Using $id for toggle
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{contact.name}</h3>
                          {(contact.title || contact.company) && (
                            <p className="text-sm text-muted-foreground">
                              {contact.title} {contact.title && contact.company ? "at " : ""}
                              {contact.company}
                            </p>
                          )}
                          {contact.metAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Met at {contact.metAt} on {new Date(contact.date || 0).toLocaleDateString()}
                            </p>
                          )}
                          {contact.email && (
                            <p className="text-xs text-muted-foreground">Email: {contact.email}</p>
                          )}
                          {contact.phone && (
                            <p className="text-xs text-muted-foreground">Phone: {contact.phone}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-muted-foreground">No contacts found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Try a different search term" : "Add contacts by scanning QR codes or manually"}
                </p>
              </div>
            )}
          </AnimatePresence>
        </InfiniteScroll>
      </ScrollArea>

      <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Fill in the details below to add a new contact to your list. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={newContact.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={newContact.title || ""}
                onChange={handleInputChange}
                placeholder="Software Engineer"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                value={newContact.company || ""}
                onChange={handleInputChange}
                placeholder="Acme Corp"
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={newContact.email || ""}
                onChange={handleInputChange}
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={newContact.phone || ""}
                onChange={handleInputChange}
                placeholder="123-456-7890"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="metAt">Met At</Label>
              <Input
                id="metAt"
                name="metAt"
                value={newContact.metAt || ""}
                onChange={handleInputChange}
                placeholder="Conference Name / Event Location"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={newContact.notes || ""}
                onChange={handleInputChange}
                placeholder="Key discussion points, follow-up actions..."
                rows={3}
              />
            </div>
            {/* Removed any input for socials here, as it's not needed for contacts */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingContact(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContact} disabled={!newContact.name}>
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}