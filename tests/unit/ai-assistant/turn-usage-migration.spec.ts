import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('project AI turn usage migration', () => {
  it('adds only content-free control and usage storage without destructive changes', async () => {
    const sql = await readFile('drizzle/0017_broad_pepper_potts.sql', 'utf8')

    expect(sql).toContain('CREATE TABLE "project_ai_turn_controls"')
    expect(sql).toContain('CREATE TABLE "project_ai_usage_events"')
    expect(sql).toContain('project_ai_turn_controls_project_user_unique')
    expect(sql).toContain('project_ai_usage_events_request_id_unique')
    expect(sql).not.toMatch(/question|answer|prompt|completion|document_text|api_key|provider_payload/iu)
    expect(sql).not.toMatch(/drop table|drop column|truncate|delete from/iu)
  })
})
