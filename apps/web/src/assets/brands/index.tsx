/** Brand icon components — inline SVGs for all integration providers */

interface IconProps { size?: number; className?: string }

export function MetaIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0012 2.04Z" fill="#1877F2"/>
    </svg>
  )
}

export function WhatsAppIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
      <path d="M11.997 2C6.477 2 2 6.477 2 11.997c0 1.781.48 3.448 1.314 4.895L2 22l5.247-1.285A9.957 9.957 0 0011.997 22c5.52 0 9.997-4.477 9.997-9.997S17.517 2 11.997 2zm0 18.19a8.185 8.185 0 01-4.222-1.167l-.302-.18-3.115.764.788-3.036-.198-.313A8.193 8.193 0 0111.997 3.81c4.52 0 8.188 3.668 8.188 8.187 0 4.52-3.668 8.188-8.188 8.188v.005z" fill="#25D366"/>
    </svg>
  )
}

export function GoogleAdsIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <path d="M12 2L2 19.5h20L12 2z" fill="#FBBC05"/>
      <path d="M12 2L2 19.5h10L12 2z" fill="#4285F4"/>
      <circle cx="18" cy="19.5" r="2.5" fill="#34A853"/>
      <circle cx="6" cy="19.5" r="2.5" fill="#EA4335"/>
    </svg>
  )
}

export function IndiaMARTIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="4" fill="#E87722"/>
      <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">IM</text>
    </svg>
  )
}

export function JustDialIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="4" fill="#E63946"/>
      <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white">JD</text>
    </svg>
  )
}

export function AcresIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="4" fill="#D62828"/>
      <text x="12" y="16" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="white">99A</text>
    </svg>
  )
}

export function HousingIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="4" fill="#00897B"/>
      <path d="M12 5L5 11v8h5v-5h4v5h5v-8L12 5z" fill="white"/>
    </svg>
  )
}

export function TradeIndiaIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="4" fill="#1565C0"/>
      <text x="12" y="16" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white">TI</text>
    </svg>
  )
}

export function ExotelIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="4" fill="#6C3FC5"/>
      <path d="M8 7h8M8 12h6M8 17h4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function SendGridIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="4" fill="#1A82E2"/>
      <path d="M6 6h5v5H6zM13 6h5v5h-5zM13 13h5v5h-5zM6 13h5v5H6z" fill="white" opacity="0.8"/>
    </svg>
  )
}

export function ResendIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="4" fill="#000000"/>
      <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">R</text>
    </svg>
  )
}

export function RazorpayIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="4" fill="#072654"/>
      <path d="M8 16l4-8 2 4-4 4z" fill="#3395FF"/>
      <path d="M14 16l2-4 2 4z" fill="#3395FF"/>
    </svg>
  )
}

export function ZapierIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="4" fill="#FF4A00"/>
      <path d="M12 4v6l4-3-4 13v-6l-4 3L12 4z" fill="white"/>
    </svg>
  )
}

/** Map integration type → brand icon component */
export const BRAND_ICONS: Record<string, React.ComponentType<IconProps>> = {
  meta: MetaIcon,
  whatsapp: WhatsAppIcon,
  google_ads: GoogleAdsIcon,
  indiamart: IndiaMARTIcon,
  justdial: JustDialIcon,
  '99acres': AcresIcon,
  housing: HousingIcon,
  tradeindia: TradeIndiaIcon,
  exotel: ExotelIcon,
  sendgrid: SendGridIcon,
  resend: ResendIcon,
  razorpay: RazorpayIcon,
  zapier: ZapierIcon,
}
