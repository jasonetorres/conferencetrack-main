"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import QrCodeGenerator from "@/components/qr-code-generator"
import ContactsList from "@/components/contacts-list"
import ProfileSettings from "@/components/profile-settings"
import HomeScreenInstructions from "@/components/home-screen-instructions"
import { UserMenu } from "@/components/user-menu"
import { ContactsProvider } from "@/hooks/use-contacts"
import { ProfileProvider } from "@/hooks/use-profile"
import { QrSettingsProvider } from "@/hooks/use-qr-settings"

export default function Home() {
  return (
    <ProtectedRoute>
      <ProfileProvider>
        <ContactsProvider>
          <QrSettingsProvider>
            <main className="container mx-auto px-4 py-6 max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Conference Contact Tracker</h1>
                <UserMenu />
              </div>

              <Tabs defaultValue="myqr" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="myqr">My QR</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts</TabsTrigger>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                </TabsList>

                <TabsContent value="myqr" className="mt-4">
                  <QrCodeGenerator />
                </TabsContent>

                <TabsContent value="contacts" className="mt-4">
                  <ContactsList />
                </TabsContent>

                <TabsContent value="profile" className="mt-4 space-y-6">
                  <ProfileSettings />
                  <HomeScreenInstructions />
                </TabsContent>
              </Tabs>
            </main>
          </QrSettingsProvider>
        </ContactsProvider>
      </ProfileProvider>
    </ProtectedRoute>
  )
}
