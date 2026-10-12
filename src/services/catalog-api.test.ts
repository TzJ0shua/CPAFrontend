import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCatalog, fetchFormCourses } from './catalog-api'

const form = { campaign: 'outubro', code: 'geral', name: 'Pesquisa', audience: 'aluno', version: 1, order: 1, scope: 'GERAL', commentAllowed: false,
  questions: [{ id: 'q1', texto: 'Pergunta', options: [{ code: 'sim', label: 'Sim' }] }] }
afterEach(() => vi.unstubAllGlobals())
describe('campaign catalog', () => {
  it('uses the selected campaign for forms and courses', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([form])))
      .mockResolvedValueOnce(new Response(JSON.stringify({ cursos: [] })))
    vi.stubGlobal('fetch', fetch)
    await fetchCatalog('aluno', 'outubro')
    await fetchFormCourses('aluno', 'outubro')
    for (const call of fetch.mock.calls) expect(new URL(String(call[0])).searchParams.get('campaign')).toBe('outubro')
  })
  it('rejects a catalog from another campaign to prevent transferring answers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ ...form, campaign: 'novembro' }]))))
    await expect(fetchCatalog('aluno', 'outubro')).rejects.toThrow('incompatível')
  })
})
