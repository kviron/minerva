import { defineEventHandler } from 'h3'
import { requireSession } from '../modules/identity/require-session'

export default defineEventHandler(async (event) => {
  await requireSession(event)

  return [
    { title: 'Главная', url: '/' },
    { title: 'Проекты', url: '/catalog' },
  ]
})
