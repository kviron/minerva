export const formatDocumentUpdatedAt = (value: string): string => new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date(value))

export const formatChildCount = (count: number): string => {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) {
    return `${count} страниц`
  }
  if (mod10 === 1) {
    return `${count} страница`
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${count} страницы`
  }
  return `${count} страниц`
}
