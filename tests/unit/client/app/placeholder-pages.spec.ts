import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { beforeAll, describe, expect, it } from 'vitest'

const dashboardPath = fileURLToPath(
  new URL('../../../../app/pages/dashboard/index.vue', import.meta.url),
)
const credentialsPath = fileURLToPath(
  new URL('../../../../app/pages/projects/[id]/credentials/index.vue', import.meta.url),
)

describe('pending pages', () => {
  let dashboardSource: string
  let credentialsSource: string

  beforeAll(async () => {
    ;[dashboardSource, credentialsSource] = await Promise.all([
      readFile(dashboardPath, 'utf8'),
      readFile(credentialsPath, 'utf8'),
    ])
  })

  it('renders the development placeholder on the dashboard and credentials pages', () => {
    expect(dashboardSource).toContain('<AppPagePlaceholder')
    expect(credentialsSource).toContain('<AppPagePlaceholder')
  })

  it('keeps credential and request logic out of the placeholder page', () => {
    expect(credentialsSource).not.toMatch(/password|token|\$fetch|useFetch/iu)
  })
})
