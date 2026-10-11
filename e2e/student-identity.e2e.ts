import { expect, test } from '@playwright/test'

test('aluno identifica-se, recebe conflito na versão 1 e responde a versão 2', async ({ page }, testInfo) => {
  const submissions: Record<string, unknown>[] = []
  await page.route('http://127.0.0.1:8199/**', async route => {
    const url = new URL(route.request().url())
    expect(url.href).not.toContain('52998224725')
    expect(url.href).not.toContain('0001234567')
    if (url.pathname.endsWith('/disponibilidade')) return route.fulfill({ json: {
      campanha: 'outubro', estado: 'ABERTA', disponivelParaResposta: true,
      dataInicio: '2026-10-01', dataFim: '2026-10-31', mensagem: null,
    } })
    if (url.pathname === '/formularios') return route.fulfill({ json: [1, 2].map(version => ({
      campaign: 'outubro', code: 'geral', name: 'Avaliação institucional', audience: 'aluno', version,
      scope: 'GERAL', order: version, commentAllowed: false,
      questions: [{ id: 'q1', texto: 'A estrutura é adequada?', options: [{ code: 'sim', label: 'Sim' }] }],
    })) })
    if (url.pathname === '/formulario') {
      submissions.push(route.request().postDataJSON())
      if (submissions.length === 1) return route.fulfill({ status: 409, json: { code: 'FORMULARIO_JA_RESPONDIDO' } })
      return route.fulfill({ json: { qrCode: 'opaque-proof', codigoDigestFinal: '012345abcd' } })
    }
    throw new Error(`Chamada inesperada: ${url.pathname}`)
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Estudante/ }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Selecione a avaliação' })).toHaveCount(0)
  await page.getByLabel('CPF').fill('52998224725')
  await page.getByLabel('Matrícula', { exact: true }).fill('0001234567')
  await expect(page.getByLabel('CPF')).toHaveValue('529.982.247-25')
  await page.screenshot({ path: testInfo.outputPath('identificacao-aluno.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  for (const version of [1, 2]) {
    await page.getByRole('button', { name: new RegExp(`Avaliação institucional.*Versão ${version}`) }).click()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await page.getByRole('button', { name: 'Finalizar Pesquisa' }).click()
    if (version === 1) await expect(page.getByText(/^Você já respondeu esta versão do formulário nesta campanha\./)).toBeVisible()
  }
  await expect(page.getByRole('heading', { name: 'Avaliação enviada' })).toBeVisible()
  expect(submissions).toHaveLength(2)
  for (let i = 0; i < 2; i++) expect(submissions[i]).toMatchObject({
    campaign: 'outubro', form: 'geral', formVersion: i + 1,
    respondent: { type: 'aluno', cpf: '52998224725', matricula: '0001234567' },
  })
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain('52998224725')
  await page.screenshot({ path: testInfo.outputPath('comprovante-aluno.png'), fullPage: true })
})
