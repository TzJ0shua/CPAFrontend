import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Student repetition/resumption is covered by student-journey and student-identity.
const audiences = ['professor', 'funcionario'] as const
const scopes = ['GERAL', 'DISCIPLINA'] as const
const cases = audiences.flatMap(audience => scopes.map(scope => ({ audience, scope, master: false })))
cases.push(...audiences.flatMap(audience => scopes.map(scope => ({ audience, scope, master: true }))))

for (const { audience, scope, master } of cases) test(`${audience}/${scope}: ${master ? 'chave mestra mantém exceção' : 'recarregar não libera repetição e outra versão é permitida'}`, async ({ page }) => {
  const requests: Record<string, unknown>[] = []
  const saved: Record<string, unknown>[] = []
  const identities = new Map<string, string>()
  const answered = new Set<string>()
  let authorizations = 0
  let exposeNewVersion = false
  await page.route('http://127.0.0.1:8199/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/disponibilidade')) return route.fulfill({ json: {
      campanha: 'outubro', estado: 'ABERTA', disponivelParaResposta: true, dataInicio: '2026-10-01', dataFim: '2026-10-31', mensagem: null,
    } })
    if (url.pathname === '/formularios') {
      expect(url.searchParams.get('publico')).toBe(audience)
      return route.fulfill({ json: (exposeNewVersion ? [1, 2] : [1]).map(version => ({
        campaign: 'outubro', code: 'avaliacao', name: 'Avaliação CPA', audience, version, scope, order: version, commentAllowed: false,
        questions: [{ id: 'q1', texto: 'A estrutura é adequada?', options: [{ code: 'sim', label: 'Sim' }] }],
      })) })
    }
    if (url.pathname === '/dados-formulario') return route.fulfill({ json: { cursos: [{ id: 1, nome: 'Curso de teste',
      disciplinas: [{ id: 10, nome: 'Disciplina A', professor: 'Professor A' }, { id: 11, nome: 'Disciplina B', professor: 'Professor B' }],
    }] } })
    if (url.pathname === '/verificacao-email/configuracao') return route.fulfill({ json: { emailDisponivel: true, chaveMestraDisponivel: true } })
    if (url.pathname === '/verificacao-email/solicitar') {
      expect(request.postDataJSON()).toMatchObject({ email: 'docente@femass.edu.br', publico: audience })
      authorizations++
      return route.fulfill({ status: 202, json: { verificationId: authorizations } })
    }
    if (url.pathname === '/verificacao-email/confirmar') {
      const token = `email-proof-${request.postDataJSON().verificationId}`
      identities.set(token, 'docente@femass.edu.br')
      return route.fulfill({ json: { submissionToken: token } })
    }
    if (url.pathname === '/verificacao-email/chave-mestra') {
      expect(request.postDataJSON()).toMatchObject({ chave: 'chave-dos-testes', publico: audience })
      authorizations++
      return route.fulfill({ json: { submissionToken: `master-proof-${authorizations}` } })
    }
    if (url.pathname === '/formulario') {
      const body = request.postDataJSON()
      requests.push(body)
      expect(body).toMatchObject({ campaign: 'outubro', form: 'avaliacao', respondent: { type: audience } })
      const identity = identities.get(body.respondent.emailVerificationToken)
      if (!master) expect(identity).toBeTruthy()
      const key = `${body.campaign}:${body.form}:${body.formVersion}:${identity}`
      if (!master && answered.has(key)) return route.fulfill({ status: 409, json: { code: 'FORMULARIO_JA_RESPONDIDO', message: 'Já respondido' } })
      answered.add(key)
      saved.push(body)
      return route.fulfill({ json: { qrCode: `receipt-${saved.length}`, codigoDigestFinal: '012345abcd' } })
    }
    throw new Error(`Chamada inesperada: ${url.pathname}`)
  })

  const identify = async (page: Page) => {
    await page.getByRole('button', { name: audience === 'professor' ? /^Docente/ : /^Funcionário/ }).click()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    if (master) {
        await page.getByLabel('Chave mestra').fill('chave-dos-testes')
        await page.getByRole('button', { name: 'Acessar com chave mestra' }).click()
      } else {
        await page.getByLabel('E-mail institucional').fill('docente@femass.edu.br')
        await page.getByRole('button', { name: 'Enviar código' }).click()
        await page.getByLabel('Código', { exact: true }).fill('PIN-TESTE')
        await page.getByRole('button', { name: 'Confirmar código' }).click()
    }
    await expect(page.getByRole('heading', { name: 'Selecione a avaliação' })).toBeVisible()
  }
  const fill = async (version: number, subject: 'A' | 'B') => {
    await page.getByRole('button', { name: new RegExp(`Avaliação CPA.*Versão ${version}`) }).click()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    if (scope === 'DISCIPLINA') {
      await page.getByRole('button', { name: /Curso de teste/ }).click()
      await page.getByRole('button', { name: 'Próximo', exact: true }).click()
      await page.getByRole('button', { name: new RegExp(`Disciplina ${subject}`) }).click()
      await page.getByRole('button', { name: 'Iniciar Questionário', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await page.getByRole('button', { name: 'Finalizar Pesquisa', exact: true }).click()
  }

  await page.goto('/')
  await identify(page)
  await fill(1, 'A')
  await expect(page.getByRole('heading', { name: 'Avaliação enviada' })).toBeVisible()
  expect(saved).toHaveLength(1)
  await page.reload()
  await identify(page)
  await fill(1, 'B')
  if (master) {
    await expect(page.getByRole('heading', { name: 'Avaliação enviada' })).toBeVisible()
    expect(saved).toHaveLength(2)
  } else {
    await expect(page.getByText(/^Você já respondeu esta versão/)).toBeVisible()
    expect(saved).toHaveLength(1)
    expect(requests).toHaveLength(2)
    exposeNewVersion = true
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
    await expect(page.getByRole('button', { name: /Avaliação CPA.*Versão 2/ })).toBeVisible()
    await fill(2, 'B')
    await expect(page.getByRole('heading', { name: 'Avaliação enviada' })).toBeVisible()
    expect(saved).toHaveLength(2)
    expect(saved[1]).toMatchObject({ formVersion: 2 })
    expect(requests).toHaveLength(3)
  }
  expect(authorizations).toBe(2)
})
