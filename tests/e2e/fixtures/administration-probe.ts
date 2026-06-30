import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return { probe: 'administration-authorized' }
})
