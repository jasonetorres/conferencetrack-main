export interface QrSettings {
  bgColor: string
  fgColor: string
  pageBackgroundColor: string
  cardBackgroundColor: string
  textColor: string
  showName: boolean
  showTitle: boolean
  showCompany: boolean
  showContact: boolean
  showSocials: boolean
  showProfilePicture: boolean
  layoutStyle: "card" | "minimal" | "business" | "modern"
  qrSize: number
  borderRadius: number
  cardPadding: number
  fontFamily: string
  fontSize: number
}
