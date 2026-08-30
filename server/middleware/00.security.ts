import { defineEventHandler, setHeader } from 'h3'

import { HTTP_SECURITY_HEADERS } from '../modules/operations/http-security'

export default defineEventHandler((event) => {
  for (const [name, value] of Object.entries(HTTP_SECURITY_HEADERS)) {
    setHeader(event, name, value)
  }
})
