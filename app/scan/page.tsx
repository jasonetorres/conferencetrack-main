"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Camera } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import type { Contact } from "@/types/contact"
import { ContactsProvider, useContacts } from "@/hooks/use-contacts"
import { toast } from "sonner"

function ScanPageContent() {
  const router = useRouter()
  const { user } = useAuth()
  const { addContact } = useContacts()
  const [error, setError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Your browser doesn't support camera access")
        return
      }

      startCamera()
    }

    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      setCameraPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsScanning(true)
        startScanning()
      }
    } catch (err) {
      console.error("Camera error:", err)
      setCameraPermission(false)
      setError("Camera permission denied or not available")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setIsScanning(false)
  }

  const startScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    scanIntervalRef.current = setInterval(() => {
      scanFrame()
    }, 500)
  }

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  }

  const handleManualInput = () => {
    const input = prompt("Enter QR code data:")
    if (input) {
      handleQrDetected(input)
    }
  }

  const handleQrDetected = (data: string) => {
    if (!data || data.trim() === "") {
      return
    }

    setScanResult(data)
    setIsScanning(false)

    try {
      const parsedData = parseQrData(data)
      if (parsedData && (parsedData.name || parsedData.email || parsedData.phone)) {
        const newContact: Contact = {
          id: Date.now().toString(),
          name: parsedData.name || "Unknown Contact",
          title: parsedData.title,
          company: parsedData.company,
          email: parsedData.email,
          phone: parsedData.phone,
          socials: parsedData.socials || {},
          notes: parsedData.notes || "Added via QR code scan",
          metAt: parsedData.metAt || "QR Code Scan",
          date: new Date().toISOString(),
        }

        addContact(newContact)
        stopCamera()
        toast.success("Contact added successfully!")
        router.push(`/contact/${newContact.id}`)
      } else {
        setError("Could not extract contact information from QR code")
      }
    } catch (err) {
      console.error("Parse error:", err)
      setError("Could not parse QR code data")
    }
  }

  const parseQrData = (data: string): Partial<Contact> | null => {
    if (!data || typeof data !== "string") {
      return null
    }

    // Try parsing as vCard
    if (data.startsWith("BEGIN:VCARD")) {
      return parseVCard(data)
    }

    // Try parsing as MeCard (common in Japanese QR codes)
    if (data.startsWith("MECARD:")) {
      return parseMeCard(data)
    }

    // Try parsing as JSON
    try {
      if (data.trim().startsWith("{") && data.trim().endsWith("}")) {
        const jsonData = JSON.parse(data)
        return {
          name: jsonData.name || jsonData.fn || jsonData.fullName,
          title: jsonData.title || jsonData.jobTitle,
          company: jsonData.company || jsonData.organization,
          email: jsonData.email,
          phone: jsonData.phone || jsonData.tel,
          socials: jsonData.socials || {},
          notes: jsonData.notes,
          metAt: "QR Code Scan",
        }
      }
    } catch (e) {
      console.log("Not valid JSON, trying other formats")
    }

    // Handle various URL formats
    if (data.startsWith("http")) {
      const url = new URL(data)
      const socialData: Partial<Contact> = {
        metAt: "QR Code Scan",
        notes: `Contact from ${url.hostname}`,
        socials: {},
      }

      // Handle common social media URLs
      if (url.hostname.includes("linkedin.com")) {
        socialData.socials!.linkedin = data
        socialData.name = "LinkedIn Contact"
      } else if (url.hostname.includes("twitter.com") || url.hostname.includes("x.com")) {
        socialData.socials!.twitter = data
        socialData.name = "Twitter Contact"
      } else if (url.hostname.includes("instagram.com")) {
        socialData.socials!.instagram = data
        socialData.name = "Instagram Contact"
      } else if (url.hostname.includes("facebook.com")) {
        socialData.socials!.facebook = data
        socialData.name = "Facebook Contact"
      } else {
        socialData.socials!.website = data
        socialData.name = "Web Contact"
      }

      return socialData
    }

    // Handle email addresses
    if (data.includes("@") && data.includes(".")) {
      return {
        name: "Email Contact",
        email: data,
        metAt: "QR Code Scan",
      }
    }

    // Handle phone numbers
    if (/^[+\d\s-()]+$/.test(data)) {
      return {
        name: "Phone Contact",
        phone: data,
        metAt: "QR Code Scan",
      }
    }

    // Handle plain text as notes
    return {
      name: "Text Note",
      notes: data,
      metAt: "QR Code Scan",
    }
  }

  const parseVCard = (vcard: string): Partial<Contact> => {
    const lines = vcard.split(/\r\n|\r|\n/).map((line) => line.trim())
    const contact: Partial<Contact> = {
      metAt: "QR Code Scan",
      notes: "Contact from vCard",
      socials: {},
    }

    let currentKey = ""
    let currentValue = ""

    lines.forEach((line) => {
      if (line.startsWith("BEGIN:") || line.startsWith("END:") || line.startsWith("VERSION:")) {
        return
      }

      // Handle line continuations
      if (line.startsWith(" ") && currentKey) {
        currentValue += line.trim()
        return
      }

      const colonIndex = line.indexOf(":")
      if (colonIndex === -1) return

      currentKey = line.substring(0, colonIndex).split(";")[0]
      currentValue = line.substring(colonIndex + 1)

      switch (currentKey) {
        case "FN":
        case "N":
          if (!contact.name) {
            contact.name = currentValue.split(";")[0]
          }
          break
        case "TITLE":
          contact.title = currentValue
          break
        case "ORG":
          contact.company = currentValue.split(";")[0]
          break
        case "EMAIL":
          contact.email = currentValue
          break
        case "TEL":
          contact.phone = currentValue
          break
        case "NOTE":
          contact.notes = currentValue
          break
        case "URL":
          if (!contact.socials) contact.socials = {}
          const urlType = line.toLowerCase().includes("linkedin")
            ? "linkedin"
            : line.toLowerCase().includes("twitter") || line.toLowerCase().includes("x.com")
            ? "twitter"
            : line.toLowerCase().includes("instagram")
            ? "instagram"
            : line.toLowerCase().includes("facebook")
            ? "facebook"
            : "website"
          contact.socials[urlType] = currentValue
          break
      }
    })

    return contact
  }

  const parseMeCard = (mecard: string): Partial<Contact> => {
    const contact: Partial<Contact> = {
      metAt: "QR Code Scan",
      notes: "Contact from MeCard",
      socials: {},
    }

    const fields = mecard.substring(7).split(";")
    fields.forEach((field) => {
      const [key, value] = field.split(":", 2)
      if (!value) return

      switch (key) {
        case "N":
          contact.name = value.replace(",", " ")
          break
        case "TEL":
          contact.phone = value
          break
        case "EMAIL":
          contact.email = value
          break
        case "ORG":
          contact.company = value
          break
        case "TITLE":
          contact.title = value
          break
        case "URL":
          if (!contact.socials) contact.socials = {}
          contact.socials.website = value
          break
        case "NOTE":
          contact.notes = value
          break
      }
    })

    return contact
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="mr-2" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Scan QR Code</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          {error ? (
            <div className="text-center p-4">
              <p className="text-red-500 mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={() => setError(null)} variant="outline" className="w-full">
                  Try Again
                </Button>
                <Button onClick={() => router.push("/")} className="w-full">
                  Go Back
                </Button>
              </div>
            </div>
          ) : cameraPermission === false ? (
            <div className="text-center p-4">
              <p className="mb-4">Please enable camera access to scan QR codes</p>
              <Button onClick={() => router.push("/")}>Go Back</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-lg bg-black">
                <video ref={videoRef} className="w-full h-64 object-cover" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg opacity-50"></div>
                </div>

                {isScanning && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                    Scanning...
                  </div>
                )}
              </div>

              <p className="text-sm text-center text-muted-foreground">
                Position the QR code within the frame to scan and add the contact
              </p>

              <Button onClick={handleManualInput} variant="outline" className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Manual Input (for testing)
              </Button>

              {scanResult && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Last scanned:</p>
                  <p className="text-xs text-muted-foreground truncate">{scanResult}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={() => router.push("/")} className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <ContactsProvider>
      <ScanPageContent />
    </ContactsProvider>
  )
}