import { describe, expect, it } from 'vitest'

import { HTTP_SECURITY_HEADERS } from '../../../server/modules/operations/http-security'

describe('HTTP security policy', () => {
  it('defines the complete application response boundary', () => {
    expect(HTTP_SECURITY_HEADERS).toEqual({
      'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; frame-src 'self' https://embed.figma.com https://www.figma.com; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    })
    expect(HTTP_SECURITY_HEADERS).not.toHaveProperty('Strict-Transport-Security')
  })
})
