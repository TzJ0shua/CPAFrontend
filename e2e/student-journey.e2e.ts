import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function identify(page: Page) {
  await page.getByRole('button', { name: /^Estudante/ }).click()
  await page.getByLabel('CPF').fill('52998224725')
  await page.getByLabel('Matrícula', { exact: true }).fill('0001234567')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
}

for (const recovery of [false, true]) test(`aluno percorre todos os formulários e disciplinas${recovery ? ', retomando após recarregar' : ''}, com rolagem e QR somente no final`, async ({ page }, testInfo) => {
  const saved = new Set<string>()
  const posts: Record<string, unknown>[] = []
  const forms = [
    { campaign: 'outubro', code: 'geral', name: 'Avaliação institucional', audience: 'aluno', version: 1, scope: 'GERAL', order: 1, commentAllowed: true,
      questions: [{ id: 'q1', texto: 'Pergunta geral. '.repeat(90), options: [{ code: 'sim', label: 'Sim' }] }] },
    { campaign: 'outubro', code: 'disciplinas', name: 'Avaliação das disciplinas', audience: 'aluno', version: 1, scope: 'DISCIPLINA', order: 2, commentAllowed: true,
      questions: [{ id: 'q1', texto: 'Pergunta da disciplina. '.repeat(90), options: [{ code: 'sim', label: 'Sim' }] }] },
  ]
  await page.route('http://127.0.0.1:8199/**', async route => {
    const url = new URL(route.request().url())
    expect(url.href).not.toMatch(/52998224725|0001234567/)
    if (url.pathname.endsWith('/disponibilidade')) return route.fulfill({ json: { campanha: 'outubro', estado: 'ABERTA', disponivelParaResposta: true } })
    if (url.pathname === '/formularios') return route.fulfill({ json: forms })
    if (url.pathname === '/dados-formulario') return route.fulfill({ json: { cursos: [{ id: 1, nome: 'Curso de teste', disciplinas: [
      { id: 10, nome: 'Disciplina A', professor: 'Professor A' }, { id: 11, nome: 'Disciplina B', professor: 'Professor B' },
    ] }] } })
    if (url.pathname === '/formulario/aluno/progresso') {
      expect(route.request().postDataJSON()).toMatchObject({ campaign: 'outubro', cpf: '52998224725', matricula: '0001234567', aceiteTermosCondicoesServico: true })
      return route.fulfill({ json: { formularios: forms.map(f => ({ code: f.code, version: 1, respondido: saved.has(f.code) })), concluida: saved.size === 2,
        comprovante: saved.size === 2 ? { qrCode: 'campaign-proof', codigoDigestFinal: '012345abcd' } : null } })
    }
    if (url.pathname === '/formulario') {
      const body = route.request().postDataJSON()
      posts.push(body)
      if (saved.has(body.form)) return route.fulfill({ status: 409, json: { code: 'FORMULARIO_JA_RESPONDIDO' } })
      saved.add(body.form)
      return route.fulfill({ json: { qrCode: 'individual-proof-not-shown' } })
    }
    throw new Error(`Chamada inesperada: ${url.pathname}`)
  })
  await page.goto('/')
  await identify(page)
  await expect(page.getByRole('heading', { name: 'Sua sequência de avaliações' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Avaliação das disciplinas/ })).toBeDisabled()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Sim', exact: true }).click()
  await page.getByLabel('Comentários adicionais').fill('Comentário institucional')
  await page.getByRole('button', { name: 'Próxima etapa' }).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Próxima etapa' }).click()
  await expect(page.getByRole('heading', { name: 'Selecione seu Curso' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.getByRole('img', { name: 'QR Code de confirmação da participação' })).toHaveCount(0)
  if (recovery) {
    await page.reload()
    await identify(page)
    await expect(page.getByText('Concluído', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Selecione seu Curso' })).toBeVisible()
    expect(posts).toHaveLength(1)
  }
  await page.getByRole('button', { name: /Curso de teste/ }).click()
  await page.getByRole('button', { name: 'Próximo', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.getByRole('button', { name: /Disciplina A/ }).click()
  await page.getByRole('button', { name: /Disciplina B/ }).click()
  await page.getByRole('button', { name: 'Iniciar Questionário' }).click()
  await page.getByRole('button', { name: 'Sim', exact: true }).click()
  await page.getByLabel('Comentários adicionais').fill('Comentário da disciplina A')
  await page.getByRole('button', { name: 'Próxima Disciplina' }).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Próxima Disciplina' }).click()
  await expect(page.getByText('Disciplina B — Professor B', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.getByRole('img', { name: 'QR Code de confirmação da participação' })).toHaveCount(0)
  expect(posts).toHaveLength(1)
  await page.getByRole('button', { name: 'Sim', exact: true }).click()
  await page.getByLabel('Comentários adicionais').fill('Comentário da disciplina B')
  await page.getByRole('button', { name: 'Finalizar Pesquisa' }).click()
  await expect(page.getByRole('heading', { name: 'Avaliação enviada' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'QR Code de confirmação da participação' })).toBeVisible()
  await expect(page.getByText('012345abcd')).toBeVisible()
  expect(posts.map(p => p.form)).toEqual(['geral', 'disciplinas'])
  expect(posts[1]).toMatchObject({ subjects: [{ subjectId: '10', comment: 'Comentário da disciplina A' }, { subjectId: '11', comment: 'Comentário da disciplina B' }] })
  await page.screenshot({ path: testInfo.outputPath('comprovante-campanha-aluno.png'), fullPage: true, animations: 'disabled' })
  await page.reload()
  await identify(page)
  await expect(page.getByRole('heading', { name: 'Avaliação enviada' })).toBeVisible()
  await expect(page.getByText('012345abcd')).toBeVisible()
  expect(posts).toHaveLength(2)
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain('52998224725')
})
