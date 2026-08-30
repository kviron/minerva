import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectIconsApi } from '../../../../app/features/projects/api/project-icons-api'

const projectId = '21b9fc31-6e20-4399-a2ea-fb4de1024821'
const iconId = '31b9fc31-6e20-4399-a2ea-fb4de1024822'
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

describe('project icons API', () => {
  it('uploads multipart data and validates the safe icon projection', async () => {
    fetchMock.mockResolvedValue({ iconId })
    const file = new File([new Uint8Array([1])], 'icon.png', { type: 'image/png' })

    await expect(projectIconsApi.upload(projectId, file, new AbortController().signal))
      .resolves.toEqual({ iconId })
    const options = fetchMock.mock.calls[0]?.[1]
    expect(options?.method).toBe('PUT')
    expect(options?.body).toBeInstanceOf(FormData)
  })

  it('rejects unsafe response fields and validates removal', async () => {
    fetchMock.mockResolvedValueOnce({ iconId, objectKey: 'private/path' })
    const file = new File([new Uint8Array([1])], 'icon.png', { type: 'image/png' })
    await expect(projectIconsApi.upload(projectId, file, new AbortController().signal))
      .rejects.toThrow('Invalid API response: PUT /api/projects/:projectId/icon')

    fetchMock.mockResolvedValueOnce({ iconId: null })
    await expect(projectIconsApi.remove(projectId, new AbortController().signal)).resolves.toEqual({ iconId: null })
  })
})
