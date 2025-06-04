"use client"

import type React from "react"
import { useState, useRef } from "react"
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Settings, Scan, Camera, Download, Palette, Type, Layout, Eye, UserCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProfile } from "@/hooks/use-profile"
import { useQrSettings } from "@/hooks/use-qr-settings"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

export default function QrCodeGenerator() {
  const router = useRouter()
  const { profile, updateProfile } = useProfile()
  const { qrSettings, updateQrSettings } = useQrSettings()
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qrContainerRef = useRef<HTMLDivElement>(null)

  // Generate QR code data using vCard format
  const generateQrData = () => {
    let vcard = "BEGIN:VCARD\n"
    vcard += "VERSION:3.0\n"

    if (profile.name) {
      vcard += `FN:${profile.name}\n`
      vcard += `N:${profile.name};;;;\n`
    }

    if (profile.title) {
      vcard += `TITLE:${profile.title}\n`
    }

    if (profile.company) {
      vcard += `ORG:${profile.company}\n`
    }

    if (profile.email) {
      vcard += `EMAIL:${profile.email}\n`
    }

    if (profile.phone) {
      vcard += `TEL:${profile.phone}\n`
    }

    if (profile.socials && Object.keys(profile.socials).length > 0) {
      Object.entries(profile.socials).forEach(([platform, url]) => {
        if (url) {
          vcard += `URL;type=${platform}:${url}\n`
        }
      })
    }

    vcard += "NOTE:Contact from Conference Contact Tracker\n"
    vcard += "END:VCARD"

    return vcard
  }

  const qrData = generateQrData()

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        updateProfile({ ...profile, profilePicture: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const downloadQRCode = async () => {
    if (!qrContainerRef.current) return
    
    setIsGenerating(true)
    try {
      // Create a canvas element
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")

      // Set canvas size to match the QR container
      const qrContainer = qrContainerRef.current
      const containerWidth = qrContainer.offsetWidth
      const containerHeight = qrContainer.offsetHeight

      canvas.width = containerWidth * 2 // Double size for better quality
      canvas.height = containerHeight * 2

      // Draw background
      ctx.scale(2, 2) // Scale up for better quality
      ctx.fillStyle = qrSettings.pageBackgroundColor
      ctx.fillRect(0, 0, containerWidth, containerHeight)

      // Convert the QR code and container to an image
      const svgData = new XMLSerializer().serializeToString(qrContainer.querySelector('svg'))
      const img = new Image()
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData)

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      // Draw the QR code
      ctx.drawImage(img, 0, 0, containerWidth, containerHeight)

      // Convert to PNG and download
      const dataUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.download = "my-qr-code.png"
      link.href = dataUrl
      link.click()

      toast.success("QR code downloaded successfully!")
    } catch (error) {
      toast.error("Failed to download QR code. Please try again.")
      console.error("Download error:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const presetThemes = [
    {
      name: "Classic",
      pageBackground: "#ffffff",
      cardBackground: "#ffffff",
      qrBackground: "#ffffff",
      qrColor: "#000000",
      textColor: "#000000",
    },
    {
      name: "Dark",
      pageBackground: "#1a1a1a",
      cardBackground: "#2a2a2a",
      qrBackground: "#ffffff",
      qrColor: "#000000",
      textColor: "#ffffff",
    },
    {
      name: "Blue",
      pageBackground: "#1e40af",
      cardBackground: "#3b82f6",
      qrBackground: "#ffffff",
      qrColor: "#1e40af",
      textColor: "#ffffff",
    },
    {
      name: "Green",
      pageBackground: "#166534",
      cardBackground: "#22c55e",
      qrBackground: "#ffffff",
      qrColor: "#166534",
      textColor: "#ffffff",
    },
    {
      name: "Purple",
      pageBackground: "#7c3aed",
      cardBackground: "#a855f7",
      qrBackground: "#ffffff",
      qrColor: "#7c3aed",
      textColor: "#ffffff",
    },
  ]

  const applyTheme = (theme: (typeof presetThemes)[0]) => {
    updateQrSettings({
      pageBackgroundColor: theme.pageBackground,
      cardBackgroundColor: theme.cardBackground,
      bgColor: theme.qrBackground,
      fgColor: theme.qrColor,
      textColor: theme.textColor,
    })
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300 -mx-4 -my-6 px-4 py-6"
      style={{ backgroundColor: qrSettings.pageBackgroundColor }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold" style={{ color: qrSettings.textColor }}>
          My QR Code
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="QR Code Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={downloadQRCode} 
            disabled={isGenerating}
            aria-label="Download QR Code"
            className="relative"
          >
            {isGenerating ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Settings className="h-4 w-4" />
              </motion.div>
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          <Button variant="default" size="icon" onClick={() => router.push("/scan")} aria-label="Scan QR Code">
            <Scan className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-120px)]"
          >
            {/* Settings Panel */}
            <Card style={{ backgroundColor: qrSettings.cardBackgroundColor }} className="h-full">
              <CardContent className="p-4 h-full">
                <Tabs defaultValue="colors" className="h-full flex flex-col">
                  <TabsList className="grid grid-cols-4 w-full mb-4">
                    <TabsTrigger value="colors" className="text-xs">
                      <Palette className="h-3 w-3 mr-1" />
                      Colors
                    </TabsTrigger>
                    <TabsTrigger value="layout" className="text-xs">
                      <Layout className="h-3 w-3 mr-1" />
                      Layout
                    </TabsTrigger>
                    <TabsTrigger value="typography" className="text-xs">
                      <Type className="h-3 w-3 mr-1" />
                      Text
                    </TabsTrigger>
                    <TabsTrigger value="display" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Display
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1">
                    <TabsContent value="colors" className="space-y-4 mt-0">
                      {/* Preset Themes */}
                      <div className="space-y-2">
                        <Label style={{ color: qrSettings.textColor }}>Quick Themes</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {presetThemes.map((theme) => (
                            <Button
                              key={theme.name}
                              variant="outline"
                              size="sm"
                              onClick={() => applyTheme(theme)}
                              className="h-10 text-xs"
                              style={{
                                backgroundColor: theme.pageBackground,
                                borderColor: theme.cardBackground,
                                color: theme.textColor,
                              }}
                            >
                              {theme.name}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Color Customization */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="pageBackground" style={{ color: qrSettings.textColor }} className="text-xs">
                            Page Background
                          </Label>
                          <Input
                            id="pageBackground"
                            type="color"
                            value={qrSettings.pageBackgroundColor}
                            onChange={(e) => updateQrSettings({ pageBackgroundColor: e.target.value })}
                            className="h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="cardBackground" style={{ color: qrSettings.textColor }} className="text-xs">
                            Card Background
                          </Label>
                          <Input
                            id="cardBackground"
                            type="color"
                            value={qrSettings.cardBackgroundColor}
                            onChange={(e) => updateQrSettings({ cardBackgroundColor: e.target.value })}
                            className="h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="bgColor" style={{ color: qrSettings.textColor }} className="text-xs">
                            QR Background
                          </Label>
                          <Input
                            id="bgColor"
                            type="color"
                            value={qrSettings.bgColor}
                            onChange={(e) => updateQrSettings({ bgColor: e.target.value })}
                            className="h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="fgColor" style={{ color: qrSettings.textColor }} className="text-xs">
                            QR Code Color
                          </Label>
                          <Input
                            id="fgColor"
                            type="color"
                            value={qrSettings.fgColor}
                            onChange={(e) => updateQrSettings({ fgColor: e.target.value })}
                            className="h-8"
                          />
                        </div>

                        <div className="space-y-1 col-span-2">
                          <Label htmlFor="textColor" style={{ color: qrSettings.textColor }} className="text-xs">
                            Text Color
                          </Label>
                          <Input
                            id="textColor"
                            type="color"
                            value={qrSettings.textColor}
                            onChange={(e) => updateQrSettings({ textColor: e.target.value })}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="layout" className="space-y-4 mt-0">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label style={{ color: qrSettings.textColor }} className="text-xs">
                            Layout Style
                          </Label>
                          <Select
                            value={qrSettings.layoutStyle}
                            onValueChange={(value) => updateQrSettings({ layoutStyle: value as any })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="card">Card Style</SelectItem>
                              <SelectItem value="minimal">Minimal</SelectItem>
                              <SelectItem value="business">Business Card</SelectItem>
                              <SelectItem value="modern">Modern</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label style={{ color: qrSettings.textColor }} className="text-xs">
                            QR Code Size: {qrSettings.qrSize}px
                          </Label>
                          <Slider
                            value={[qrSettings.qrSize]}
                            onValueChange={(value) => updateQrSettings({ qrSize: value[0] })}
                            max={280}
                            min={120}
                            step={10}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label style={{ color: qrSettings.textColor }} className="text-xs">
                            Border Radius: {qrSettings.borderRadius}px
                          </Label>
                          <Slider
                            value={[qrSettings.borderRadius]}
                            onValueChange={(value) => updateQrSettings({ borderRadius: value[0] })}
                            max={30}
                            min={0}
                            step={2}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label style={{ color: qrSettings.textColor }} className="text-xs">
                            Card Padding: {qrSettings.cardPadding}px
                          </Label>
                          <Slider
                            value={[qrSettings.cardPadding]}
                            onValueChange={(value) => updateQrSettings({ cardPadding: value[0] })}
                            max={40}
                            min={8}
                            step={2}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="typography" className="space-y-4 mt-0">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label style={{ color: qrSettings.textColor }} className="text-xs">
                            Font Family
                          </Label>
                          <Select
                            value={qrSettings.fontFamily}
                            onValueChange={(value) => updateQrSettings({ fontFamily: value })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Inter">Inter (Default)</SelectItem>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Helvetica">Helvetica</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                              <SelectItem value="Courier New">Courier New</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label style={{ color: qrSettings.textColor }} className="text-xs">
                            Font Size: {qrSettings.fontSize}px
                          </Label>
                          <Slider
                            value={[qrSettings.fontSize]}
                            onValueChange={(value) => updateQrSettings({ fontSize: value[0] })}
                            max={20}
                            min={10}
                            step={1}
                            className="w-full"
                          />
                        </div>

                        {/* Profile Picture */}
                        <div className="space-y-2">
                          <Label style={{ color: qrSettings.textColor }} className="text-xs">
                            Profile Picture
                          </Label>
                          <div className="flex items-center gap-2">
                            {profile.profilePicture && (
                              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                <Image
                                  src={profile.profilePicture || "/placeholder.svg"}
                                  alt="Profile"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex gap-1 flex-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs h-7 flex-1"
                              >
                                <Camera className="h-3 w-3 mr-1" />
                                {profile.profilePicture ? "Change" : "Add"}
                              </Button>
                              {profile.profilePicture && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateProfile({ ...profile, profilePicture: undefined })}
                                  className="text-xs h-7"
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="display" className="space-y-3 mt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showProfilePicture" style={{ color: qrSettings.textColor }} className="text-xs">
                            Profile Picture
                          </Label>
                          <Switch
                            id="showProfilePicture"
                            checked={qrSettings.showProfilePicture}
                            onCheckedChange={(checked) => updateQrSettings({ showProfilePicture: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="showName" style={{ color: qrSettings.textColor }} className="text-xs">
                            Name
                          </Label>
                          <Switch
                            id="showName"
                            checked={qrSettings.showName}
                            onCheckedChange={(checked) => updateQrSettings({ showName: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="showTitle" style={{ color: qrSettings.textColor }} className="text-xs">
                            Job Title
                          </Label>
                          <Switch
                            id="showTitle"
                            checked={qrSettings.showTitle}
                            onCheckedChange={(checked) => updateQrSettings({ showTitle: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="showCompany" style={{ color: qrSettings.textColor }} className="text-xs">
                            Company
                          </Label>
                          <Switch
                            id="showCompany"
                            checked={qrSettings.showCompany}
                            onCheckedChange={(checked) => updateQrSettings({ showCompany: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="showContact" style={{ color: qrSettings.textColor }} className="text-xs">
                            Contact Info
                          </Label>
                          <Switch
                            id="showContact"
                            checked={qrSettings.showContact}
                            onCheckedChange={(checked) => updateQrSettings({ showContact: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="showSocials" style={{ color: qrSettings.textColor }} className="text-xs">
                            Social Links
                          </Label>
                          <Switch
                            id="showSocials"
                            checked={qrSettings.showSocials}
                            onCheckedChange={(checked) => updateQrSettings({ showSocials: checked })}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </ScrollArea>

                  <Button variant="outline" onClick={() => setShowSettings(false)} className="mt-4 w-full h-8 text-xs">
                    Done Customizing
                  </Button>
                </Tabs>
              </CardContent>
            </Card>

            {/* Live Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center"
              ref={qrContainerRef}
            >
              <Card
                className="w-full max-w-sm transition-all duration-300"
                style={{
                  backgroundColor: qrSettings.cardBackgroundColor,
                  borderRadius: `${qrSettings.borderRadius}px`,
                  padding: `${qrSettings.cardPadding}px`,
                }}
              >
                <CardContent className="flex flex-col items-center justify-center p-0">
                  {/* Profile Picture */}
                  {qrSettings.showProfilePicture && profile.profilePicture && (
                    <div className="mb-3">
                      <div
                        className="relative overflow-hidden"
                        style={{
                          width: `${qrSettings.qrSize * 0.25}px`,
                          height: `${qrSettings.qrSize * 0.25}px`,
                          borderRadius: `${qrSettings.borderRadius}px`,
                        }}
                      >
                        <Image
                          src={profile.profilePicture || "/placeholder.svg"}
                          alt="Profile"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* QR Code */}
                  <div
                    className="p-3 transition-all duration-300"
                    style={{
                      backgroundColor: qrSettings.bgColor,
                      borderRadius: `${qrSettings.borderRadius}px`,
                    }}
                  >
                    <QRCode
                      value={qrData}
                      size={qrSettings.qrSize}
                      bgColor={qrSettings.bgColor}
                      fgColor={qrSettings.fgColor}
                      level="H"
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="mt-3 text-center w-full" style={{ fontFamily: qrSettings.fontFamily }}>
                    {qrSettings.showName && profile.name && (
                      <h3
                        className="font-bold transition-all duration-300 truncate"
                        style={{
                          color: qrSettings.textColor,
                          fontSize: `${qrSettings.fontSize + 2}px`,
                        }}
                      >
                        {profile.name}
                      </h3>
                    )}
                    {qrSettings.showTitle && profile.title && (
                      <p
                        className="transition-all duration-300 truncate"
                        style={{
                          color: qrSettings.textColor,
                          fontSize: `${qrSettings.fontSize - 1}px`,
                          opacity: 0.8,
                        }}
                      >
                        {profile.title}
                      </p>
                    )}
                    {qrSettings.showCompany && profile.company && (
                      <p
                        className="transition-all duration-300 truncate"
                        style={{
                          color: qrSettings.textColor,
                          fontSize: `${qrSettings.fontSize - 1}px`,
                          opacity: 0.8,
                        }}
                      >
                        {profile.company}
                      </p>
                    )}
                    {qrSettings.showContact && (profile.email || profile.phone) && (
                      <div className="mt-2 space-y-1">
                        {profile.email && (
                          <p
                            className="transition-all duration-300 truncate"
                            style={{
                              color: qrSettings.textColor,
                              fontSize: `${qrSettings.fontSize - 2}px`,
                              opacity: 0.7,
                            }}
                          >
                            {profile.email}
                          </p>
                        )}
                        {profile.phone && (
                          <p
                            className="transition-all duration-300"
                            style={{
                              color: qrSettings.textColor,
                              fontSize: `${qrSettings.fontSize - 2}px`,
                              opacity: 0.7,
                            }}
                          >
                            {profile.phone}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <p
                className="text-sm text-center mt-6 transition-all duration-300"
                style={{
                  color: qrSettings.textColor,
                  opacity: 0.7,
                }}
              >
                Scan with any QR scanner to add contact to phone
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]"
            ref={qrContainerRef}
          >
            <Card
              className="w-full max-w-sm transition-all duration-300"
              style={{
                backgroundColor: qrSettings.cardBackgroundColor,
                borderRadius: `${qrSettings.borderRadius}px`,
                padding: `${qrSettings.cardPadding}px`,
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-0">
                {/* Profile Picture */}
                {qrSettings.showProfilePicture && (
                  <div className="mb-4">
                    {profile.profilePicture ? (
                      <div
                        className="relative overflow-hidden"
                        style={{
                          width: `${qrSettings.qrSize * 0.4}px`,
                          height: `${qrSettings.qrSize * 0.4}px`,
                          borderRadius: "50%",
                        }}
                      >
                        <Image
                          src={profile.profilePicture || "/placeholder.svg"}
                          alt="Profile"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-center bg-muted"
                        style={{
                          width: `${qrSettings.qrSize * 0.4}px`,
                          height: `${qrSettings.qrSize * 0.4}px`,
                          borderRadius: "50%",
                        }}
                      >
                        <UserCircle
                          style={{
                            width: `${qrSettings.qrSize * 0.25}px`,
                            height: `${qrSettings.qrSize * 0.25}px`,
                          }}
                          className="text-muted-foreground"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* QR Code */}
                <div
                  className="p-4 transition-all duration-300"
                  style={{
                    backgroundColor: qrSettings.bgColor,
                    borderRadius: `${qrSettings.borderRadius}px`,
                  }}
                >
                  <QRCode
                    value={qrData}
                    size={qrSettings.qrSize}
                    bgColor={qrSettings.bgColor}
                    fgColor={qrSettings.fgColor}
                    level="H"
                  />
                </div>

                {/* Contact Information */}
                <div className="mt-4 text-center" style={{ fontFamily: qrSettings.fontFamily }}>
                  {qrSettings.showName && profile.name && (
                    <h3
                      className="font-bold transition-all duration-300"
                      style={{
                        color: qrSettings.textColor,
                        fontSize: `${qrSettings.fontSize + 4}px`,
                      }}
                    >
                      {profile.name}
                    </h3>
                  )}
                  {qrSettings.showTitle && profile.title && (
                    <p
                      className="transition-all duration-300"
                      style={{
                        color: qrSettings.textColor,
                        fontSize: `${qrSettings.fontSize}px`,
                        opacity: 0.8,
                      }}
                    >
                      {profile.title}
                    </p>
                  )}
                  {qrSettings.showCompany && profile.company && (
                    <p
                      className="transition-all duration-300"
                      style={{
                        color: qrSettings.textColor,
                        fontSize: `${qrSettings.fontSize}px`,
                        opacity: 0.8,
                      }}
                    >
                      {profile.company}
                    </p>
                  )}
                  {qrSettings.showContact && (profile.email || profile.phone) && (
                    <div className="mt-2 space-y-1">
                      {profile.email && (
                        <p
                          className="transition-all duration-300"
                          style={{
                            color: qrSettings.textColor,
                            fontSize: `${qrSettings.fontSize - 2}px`,
                            opacity: 0.7,
                          }}
                        >
                          {profile.email}
                        </p>
                      )}
                      {profile.phone && (
                        <p
                          className="transition-all duration-300"
                          style={{
                            color: qrSettings.textColor,
                            fontSize: `${qrSettings.fontSize - 2}px`,
                            opacity: 0.7,
                          }}
                        >
                          {profile.phone}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <p
              className="text-sm text-center mt-6 transition-all duration-300"
              style={{
                color: qrSettings.textColor,
                opacity: 0.7,
              }}
            >
              Scan with any QR scanner to add contact to phone
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}