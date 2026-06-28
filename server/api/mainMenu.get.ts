
/**
 * Получаем пукты главного меню
 */
export default defineEventHandler(async (event) => {
  // 1. Получаем пользователя/роль (например, из сессии, кук или заголовков)
  // Для примера представим, что вы используете nuxt-auth-utils, supabase или аналоги
  const user = event.context.user // Или получить роль из куки/токена
  const userRole = user?.role || 'guest' // 'guest', 'user', 'admin'

  // 2. База данных всех возможных пунктов меню (или запрос к БД)
  const allMenuItems = [
    { title: 'Главная', url: '/', roles: ['guest', 'user', 'admin'] },
    { title: 'Проекты', url: '/catalog', roles: ['guest', 'user', 'admin'] },
  ]

  // 3. Фильтруем пункты: оставляем только те, которые подходят под роль пользователя
  const allowedMenu = allMenuItems.filter(item => item.roles.includes(userRole))

  // 4. Возвращаем только безопасные данные (роли фронтенду знать не обязательно)
  return allowedMenu.map(({ title, url }) => ({ title, url }))
})