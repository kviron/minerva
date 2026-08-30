import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectsApi } from '../../../../app/features/projects/api/projects-api'

const projectId = '21b9fc31-6e20-4399-a2ea-fb4de1024821'
const memberProject = {
  id: projectId,
  name: 'Minerva',
  description: null,
  status: 'active',
  iconId: null,
  updatedAt: '2026-07-10T10:00:00.000Z',
  role: { builtInKey: 'admin', customName: null },
}
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

describe('projects API adapter', () => {
  it('returns a validated member projection', async () => {
    fetchMock.mockResolvedValue({ items: [memberProject], nextCursor: null })
    await expect(projectsApi.list()).resolves.toEqual({ items: [memberProject], nextCursor: null })
  })

  it('rejects unsafe response fields at the HTTP boundary', async () => {
    fetchMock.mockResolvedValue({ items: [{ ...memberProject, createdByUserId: 'private' }], nextCursor: null })
    await expect(projectsApi.list()).rejects.toThrow('Invalid API response: GET /api/projects')
  })

  it('validates the create response and sends the request body', async () => {
    const input = { name: 'Minerva', description: null }
    fetchMock.mockResolvedValue({ projectId })
    await expect(projectsApi.create(input)).resolves.toEqual({ projectId })
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', { method: 'POST', body: input, signal: undefined })
  })
})
