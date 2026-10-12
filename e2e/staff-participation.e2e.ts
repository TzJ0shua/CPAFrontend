import { expect, test } from '@playwright/test'

for (const publico of ['professor', 'funcionario']) {
  test(`${publico}: repetição por email bloqueada, nova versão com comentário permitida`, async ({ page }, testInfo) => {
    const submissions: Record<string, unknown>[] = []
    let pinRequests = 0
    await page.route('http://127.0.0.1:8199/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/disponibilidade')) return route.fulfill({ json: {
        campanha: 'outubro', estado: 'ABERTA', disponivelParaResposta: true, dataInicio: '2026-10-01', dataFim: '2026-10-31', mensagem: null,
      } })
      if (path === '/formularios') return route.fulfill({ json: [1, 2].map(version => ({
        campaign: 'outubro', code: 'instituicao', name: 'Avaliação institucional', audience: publico, version, scope: 'GERAL', order: version,
        commentAllowed: true, commentNotice: 'Comentário opcional.',
        questions: [{ id: 'q1', texto: 'A estrutura é adequada?', options: [{ code: 'sim', label: 'Sim' }] }],
      })) })
      if (path === '/verificacao-email/configuracao') return route.fulfill({ json: { emailDisponivel: true, chaveMestraDisponivel: true } })
      if (path === '/verificacao-email/solicitar') {
        pinRequests++
        expect(route.request().postDataJSON()).toMatchObject({ email: 'docente@femass.edu.br', publico })
        return route.fulfill({ status: 202, json: { verificationId: 7 } })
      }
      if (path === '/verificacao-email/confirmar') return route.fulfill({ json: { submissionToken: 'confirmed-email-proof' } })
      if (path === '/formulario') {
        submissions.push(route.request().postDataJSON())
        return submissions.length === 1 ? route.fulfill({ status: 409, json: { code: 'FORMULARIO_JA_RESPONDIDO' } })
          : route.fulfill({ json: { qrCode: 'opaque-proof', codigoDigestFinal: '012345abcd' } })
      }
      throw new Error(`Chamada inesperada: ${path}`)
    })
    await page.goto('/')
    await page.getByRole('button', { name: publico === 'professor' ? /^Docente/ : /^Funcionário/ }).click()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await page.getByLabel('E-mail institucional').fill('docente@femass.edu.br')
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await page.getByLabel('Código', { exact: true }).fill('PIN-TESTE')
    await page.getByRole('button', { name: 'Confirmar código' }).click()
    await expect(page.getByRole('heading', { name: 'Selecione a avaliação' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Avaliação institucional.*Versão 2/ })).toBeVisible()
    await page.getByRole('button', { name: /Avaliação institucional.*Versão 1/ }).click()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await page.getByLabel(/Comentários adicionais/).fill('Comentário da primeira versão')
    await page.getByRole('button', { name: 'Próxima etapa' }).click()
    await expect(page.getByText(/^Você já respondeu esta versão/)).toBeVisible()
    await page.getByRole('button', { name: /Avaliação institucional.*Versão 2/ }).click()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await expect(page.getByLabel(/Comentários adicionais/)).toHaveValue('')
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await page.getByLabel(/Comentários adicionais/).fill('Comentário da segunda versão')
    await page.screenshot({ path: testInfo.outputPath('comentarios.png'), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Finalizar Pesquisa' }).click()
    await expect(page.getByRole('heading', { name: 'Avaliação enviada' })).toBeVisible()
    expect(pinRequests).toBe(1)
    expect(submissions).toHaveLength(2)
    expect(submissions[1]).toMatchObject({ formVersion: 2, comment: 'Comentário da segunda versão',
      respondent: { type: publico, emailVerificationToken: 'confirmed-email-proof' } })
    expect(JSON.stringify(submissions)).not.toContain('docente@femass.edu.br')
  })
}
