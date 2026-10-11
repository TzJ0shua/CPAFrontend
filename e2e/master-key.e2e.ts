import { expect, test } from '@playwright/test'

for (const emailAvailable of [true, false]) {
  test(`acesso por chave mestra com email ${emailAvailable ? 'disponível' : 'indisponível'}`, async ({ page }, testInfo) => {
    let keyRequests = 0
    let submitted: Record<string, unknown> | null = null
    await page.route('http://127.0.0.1:8199/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/disponibilidade')) return route.fulfill({ json: {
        campanha: 'outubro', estado: 'ABERTA', disponivelParaResposta: true, dataInicio: '2026-10-01', dataFim: '2026-10-31', mensagem: null,
      } })
      if (path === '/formularios') return route.fulfill({ json: [{ campaign: 'outubro', code: 'docente', name: 'Avaliação docente', audience: 'professor', version: 1,
        scope: 'GERAL', order: 1, commentAllowed: false, questions: [{ id: 'q1', texto: 'A estrutura é adequada?', options: [{ code: 'sim', label: 'Sim' }] }] }] })
      if (path === '/verificacao-email/configuracao') return route.fulfill({ json: { emailDisponivel: emailAvailable, chaveMestraDisponivel: true } })
      if (path === '/verificacao-email/chave-mestra') {
        keyRequests++
        const body = route.request().postDataJSON()
        expect(body).toEqual({ chave: keyRequests === 1 ? 'errada' : 'segredo-teste', publico: 'professor', campaign: 'outubro', form: 'docente', formVersion: 1 })
        return keyRequests === 1 ? route.fulfill({ status: 401, json: { error: 'Chave mestra inválida' } })
          : route.fulfill({ json: { submissionToken: 'opaque-master-proof' } })
      }
      if (path === '/formulario') {
        submitted = route.request().postDataJSON()
        return route.fulfill({ json: {} })
      }
      throw new Error(`Chamada inesperada: ${path}`)
    })
    await page.goto('/')
    await page.getByRole('button', { name: /^Docente/ }).click()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    const email = page.getByLabel('E-mail institucional')
    if (emailAvailable) {
      await expect(page.getByRole('button', { name: 'Enviar código' })).toBeEnabled()
      await expect(email).toBeEditable()
    } else {
      await expect(page.getByText('Serviço de email indisponível', { exact: true })).toBeVisible()
      await expect(email).toHaveAttribute('readonly', '')
      await expect(page.getByRole('button', { name: 'Enviar código' })).toBeDisabled()
    }
    await page.getByLabel('Chave mestra').fill('errada')
    await page.getByRole('button', { name: 'Acessar com chave mestra' }).click()
    await expect(page.getByText('Chave mestra inválida.', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Chave mestra')).toHaveValue('')
    await page.screenshot({ path: testInfo.outputPath('acesso-chave-mestra.png'), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByLabel('Chave mestra').fill('segredo-teste')
    await page.getByRole('button', { name: 'Acessar com chave mestra' }).click()
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await page.getByRole('button', { name: 'Finalizar Pesquisa' }).click()
    await expect(page.getByRole('heading', { name: 'Avaliação enviada' })).toBeVisible()
    expect(submitted).toMatchObject({ campaign: 'outubro', respondent: { type: 'professor', emailVerificationToken: 'opaque-master-proof' } })
    expect(JSON.stringify(submitted)).not.toContain('segredo-teste')
    expect(keyRequests).toBe(2)
    expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain('segredo-teste')
    expect(page.url()).not.toContain('segredo-teste')
  })
}
