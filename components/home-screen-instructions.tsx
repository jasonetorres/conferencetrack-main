"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Info } from "lucide-react"

export default function HomeScreenInstructions() {
  const [platform, setPlatform] = useState("ios")

  return (
    <div className="flex justify-center mt-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-4 w-4" />
            Add to Home Screen
          </CardTitle>
          <CardDescription>For easier access, add this app to your phone&apos;s home screen</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={platform} onValueChange={setPlatform} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="ios">iOS</TabsTrigger>
              <TabsTrigger value="android">Android</TabsTrigger>
            </TabsList>

            <TabsContent value="ios" className="space-y-2 mt-4">
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                <li>Open this page in Safari</li>
                <li>Tap the Share button (box with arrow) at the bottom of the screen</li>
                <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                <li>Tap &quot;Add&quot; in the top-right corner</li>
              </ol>
            </TabsContent>

            <TabsContent value="android" className="space-y-2 mt-4">
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                <li>Open this page in Chrome</li>
                <li>Tap the three dots (⋮) in the top-right corner</li>
                <li>Tap &quot;Add to Home screen&quot;</li>
                <li>Tap &quot;Add&quot; to confirm</li>
              </ol>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
