import { expect, test } from '@playwright/test'

test('sem campanha vigente, o preenchimento fica indisponível', async ({ page }) => {
  await page.route('http://127.0.0.1:8199/**', route => route.fulfill({ json: {
    campanha: null, estado: null, dataInicio: null, dataFim: null, disponivelParaResposta: false,
    mensagem: 'Não há campanha disponível para respostas no momento.',
  } }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Pesquisa indisponível' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Estudante/ })).toHaveCount(0)
})

test('seleciona campanha automaticamente e bloqueia ao expirar sem mudar de campanha', async ({ page }, testInfo) => {
  let expired = false
  const paths: string[] = []
  await page.clock.install()
  await page.route('http://127.0.0.1:8199/**', async route => {
    const url = new URL(route.request().url())
    paths.push(url.pathname)
    if (url.pathname.endsWith('/disponibilidade')) return route.fulfill({ json: {
      campanha: url.pathname.includes('/atual/') && expired ? 'novembro' : 'outubro', estado: 'ABERTA',
      disponivelParaResposta: !expired || url.pathname.includes('/atual/'), mensagem: expired ? 'Período terminado.' : null,
      dataInicio: '2036-10-01', dataFim: '2036-10-31',
    } })
    if (url.pathname === '/formularios') {
      expect(url.searchParams.get('campaign')).toBe('outubro')
      return route.fulfill({ json: [{ campaign: 'outubro', code: 'geral', name: 'Pesquisa de outubro', audience: 'aluno', version: 1, order: 1,
        scope: 'GERAL', commentAllowed: false, questions: [{ id: 'q1', texto: 'Pergunta', options: [{ code: 'sim', label: 'Sim' }] }] }] })
    }
    return route.fulfill({ json: {} })
  })
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Estudante/ })).toBeVisible()
  await page.getByRole('button', { name: /Estudante/ }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('button', { name: /Pesquisa de outubro/ })).toBeVisible()
  expired = true
  await page.clock.fastForward(60_000)
  await expect(page.getByRole('heading', { name: 'Pesquisa indisponível' })).toBeVisible()
  await expect(page.getByText('Período terminado.')).toBeVisible()
  expect(paths.filter(path => path === '/campanhas/atual/disponibilidade')).toHaveLength(1)
  expect(paths).toContain('/campanhas/outubro/disponibilidade')
  await page.screenshot({ path: testInfo.outputPath('campanha-expirada.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
