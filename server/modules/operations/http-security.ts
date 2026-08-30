export const HTTP_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; frame-src 'self' https://embed.figma.com https://www.figma.com; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}
