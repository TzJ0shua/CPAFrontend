import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function mockServices(page: Page, role = 'cpa-admin', state = 'PUBLICADA') {
  let nonce = ''
  await page.route('http://127.0.0.1:8189/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/auth')) {
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      expect(url.searchParams.get('code_challenge')).toBeTruthy()
      nonce = url.searchParams.get('nonce') || ''
      const callback = new URL(url.searchParams.get('redirect_uri')!)
      callback.hash = new URLSearchParams({ state: url.searchParams.get('state')!, code: 'test-code', session_state: 'session' }).toString()
      await route.fulfill({ status: 302, headers: { Location: callback.toString() } })
    } else if (url.pathname.endsWith('/token')) {
      const now = Math.floor(Date.now() / 1000)
      const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
      const token = `${encode({ alg: 'RS256' })}.${encode({ sub: 'test-admin', preferred_username: 'comissao', iss: 'http://127.0.0.1:8189/realms/cpa', aud: 'cpa-backend', realm_access: { roles: [role] }, exp: now + 300, iat: now, nonce })}.test-signature`
      await route.fulfill({ json: { access_token: token, id_token: token, refresh_token: token, token_type: 'Bearer', expires_in: 300 }, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5194', 'Access-Control-Allow-Credentials': 'true' } })
    } else if (url.pathname.endsWith('/logout')) {
      await route.fulfill({ status: 302, headers: { Location: url.searchParams.get('post_logout_redirect_uri') || 'http://127.0.0.1:5194/' } })
    } else await route.fulfill({ json: {} })
  })
  const courses = [{ id: 1, nome: 'Engenharia de Produção', ativo: true }, { id: 2, nome: 'Administração', ativo: true }, { id: 3, nome: 'Curso desativado', ativo: false }]
  const campaigns = [{ id: 1, codigo: 'cpa-2026', nome: 'Avaliação institucional 2026', mensagem: null, estado: 'ABERTA', ativo: true, dataInicio: '2026-10-01', dataFim: '2026-10-31', disponivelParaResposta: true }]
  const version = { id: 1, numero: 1, codigo: 'geral', nome: 'Avaliação institucional', publico: 'aluno', escopo: 'GERAL', ordem: 1, commentAllowed: false, commentNotice: null, estado: state, ativo: true, perguntas: [{ id: 1, codigo: 'q1', texto: 'A instituição oferece uma boa experiência de aprendizagem?', ordem: 1, ativo: true, opcoes: [{ id: 1, code: 'sim', label: 'Concordo totalmente', value: 4, naoSeiResponder: false, ativo: true }] }] }
  await page.route('http://127.0.0.1:8199/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5194', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (path.startsWith('/admin/')) expect(request.headers().authorization).toMatch(/^Bearer /)
    if (path === '/admin/campanhas' && request.method() === 'POST') {
      const item = { ...request.postDataJSON(), id: campaigns.length + 1, estado: 'RASCUNHO', ativo: true, disponivelParaResposta: false }
      campaigns.push(item)
      return route.fulfill({ status: 201, json: item, headers })
    }
    if (/^\/admin\/campanhas\/[^/]+$/.test(path) && request.method() === 'PUT') {
      Object.assign(campaigns.find(c => c.codigo === decodeURIComponent(path.split('/')[3]))!, request.postDataJSON())
      return route.fulfill({ status: 204, headers })
    }
    if (path.endsWith('/versoes/1') && request.method() === 'PUT') {
      Object.assign(version, request.postDataJSON())
      return route.fulfill({ status: 204, headers })
    }
    if (path.endsWith('/versoes/1/publicar') && request.method() === 'POST') {
      version.estado = 'PUBLICADA'
      return route.fulfill({ status: 204, headers })
    }
    if (path === '/admin/cursos' && request.method() === 'POST') {
      const item = { id: courses.length + 1, nome: request.postDataJSON().nome as string, ativo: true }; courses.push(item)
      return route.fulfill({ status: 201, json: item, headers })
    }
    if (/\/admin\/cursos\/\d+\/status$/.test(path)) {
      courses.find(c => c.id === Number(path.split('/')[3]))!.ativo = request.postDataJSON().ativo
      return route.fulfill({ status: 204, headers })
    }
    let json: unknown = []
    if (path === '/admin/cursos') json = courses
    else if (path === '/admin/disciplinas') json = [{ id: 1, nome: 'Planejamento e Controle da Produção', professor: 'Maria Silva', cursoId: 1, cursoNome: courses[0].nome, cursoAtivo: true, ativo: true }]
    else if (path === '/admin/campanhas') json = campaigns
    else if (/^\/admin\/campanhas\/[^/]+$/.test(path)) json = campaigns.find(c => c.codigo === decodeURIComponent(path.split('/')[3]))
    else if (path.endsWith('/versoes/1')) json = version
    else if (path.endsWith('/versoes')) json = [version]
    else if (path.endsWith('/disponibilidade')) json = { campanha: 'cpa-2026', estado: 'ABERTA', disponivelParaResposta: true, mensagem: null }
    await route.fulfill({ json, headers })
  })
  return { version, campaigns }
}

test('login PKCE, acesso direto, recarregamento, cadastros, desativação e navegação', async ({ page }, testInfo) => {
  await mockServices(page)
  await page.goto('/admin/cursos')
  await expect(page.getByRole('heading', { name: 'Cursos', exact: true })).toBeVisible()
  await expect(page.getByText('Engenharia de Produção', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Engenharia de Produção', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Novo curso' }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Sistemas de Informação')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: 'Sistemas de Informação' })
  await expect(row).toBeVisible()
  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: 'Desativar' }).click()
  await expect(row).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('inactive')
  await expect(row).toBeVisible()
  await page.getByRole('link', { name: 'Disciplinas', exact: true }).click()
  await expect(page.getByText('Maria Silva')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('disciplinas.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.goto('/admin/campanhas/cpa-2026/formularios/geral/versoes/1')
  await expect(page.getByRole('heading', { name: 'Versão 1' })).toBeVisible()
  await expect(page.getByLabel('Texto')).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar rascunho' })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('versao-publicada.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL('http://127.0.0.1:5194/')
})

test('bloqueia usuário sem perfil administrativo', async ({ page }) => {
  await mockServices(page, 'participante')
  await page.goto('/admin/disciplinas')
  await expect(page.getByRole('heading', { name: 'Acesso negado' })).toBeVisible()
  await expect(page.getByText('Maria Silva')).toHaveCount(0)
})

test('configura período no cadastro e na edição da campanha', async ({ page }, testInfo) => {
  await mockServices(page)
  await page.goto('/admin/campanhas')
  await expect(page.getByText('01/10/2026 a 31/10/2026')).toBeVisible()
  await page.getByRole('button', { name: 'Nova campanha' }).click()
  await page.getByLabel('Código', { exact: true }).fill('outubro')
  await page.getByLabel('Nome', { exact: true }).fill('Campanha de outubro')
  await page.getByLabel('Início', { exact: true }).fill('2036-10-01')
  await page.getByLabel('Fim', { exact: true }).fill('2036-10-31')
  await page.screenshot({ path: testInfo.outputPath('periodo-campanha.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('01/10/2036 a 31/10/2036')).toBeVisible()
  await page.getByRole('link', { name: 'Campanha de outubro', exact: true }).click()
  await page.getByRole('button', { name: 'Editar campanha' }).click()
  await expect(page.getByLabel('Início', { exact: true })).toHaveValue('2036-10-01')
  await page.getByLabel('Fim', { exact: true }).fill('2036-11-05')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('01/10/2036 a 05/11/2036')).toBeVisible()
  await page.goto('/admin/campanhas/cpa-2026')
  await page.getByRole('button', { name: 'Editar campanha' }).click()
  await expect(page.getByRole('note')).toContainText('imediatamente')
  await page.getByLabel('Fim', { exact: true }).fill('2026-11-01')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('01/10/2026 a 01/11/2026')).toBeVisible()
})

test('exige salvar alterações antes de publicar um rascunho', async ({ page }) => {
  await mockServices(page, 'cpa-admin', 'RASCUNHO')
  await page.goto('/admin/campanhas/cpa-2026/formularios/geral/versoes/1')
  const publish = page.getByRole('button', { name: 'Publicar versão salva' })
  await expect(publish).toBeEnabled()
  await page.getByRole('textbox', { name: 'Texto', exact: true }).fill('Pergunta atualizada')
  await expect(publish).toBeDisabled()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(publish).toBeEnabled()
  page.once('dialog', dialog => dialog.accept())
  await publish.click()
  await expect(page.getByRole('textbox', { name: 'Texto', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Texto', exact: true })).toHaveValue('Pergunta atualizada')
})

test('clona formulário de campanha encerrada e remove perguntas do rascunho', async ({ page }, testInfo) => {
  await mockServices(page)
  const target = { id: 1, codigo: 'cpa-2026', nome: 'Campanha atual', estado: 'RASCUNHO', ativo: true }
  const origin = { id: 2, codigo: 'cpa-2025', nome: 'Campanha antiga', estado: 'ENCERRADA', ativo: false }
  const original = { id: 2, numero: 1, codigo: 'geral', nome: 'Formulário histórico', publico: 'aluno', escopo: 'GERAL', ordem: 1,
    commentAllowed: false, commentNotice: null, estado: 'PUBLICADA', ativo: false,
    perguntas: [{ id: 10, codigo: 'q1', texto: 'Pergunta histórica', ordem: 1, ativo: true,
      opcoes: [{ id: 20, code: 'sim', label: 'Sim', value: 1, naoSeiResponder: false, ativo: true }] }] }
  const copy = { ...structuredClone(original), id: 3, codigo: 'copia', estado: 'RASCUNHO', ativo: true }
  copy.perguntas[0].id = 30; copy.perguntas[0].opcoes[0].id = 40
  await page.route('http://127.0.0.1:8199/**', async route => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5194', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS' }
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (path.startsWith('/admin/')) expect(route.request().headers().authorization).toMatch(/^Bearer /)
    if (path === '/admin/campanhas') return route.fulfill({ json: [target, origin], headers })
    if (path === '/admin/campanhas/cpa-2026') return route.fulfill({ json: target, headers })
    if (path === '/admin/campanhas/cpa-2026/formularios') return route.fulfill({ json: [], headers })
    if (path === '/admin/campanhas/cpa-2025/formularios') return route.fulfill({ json: [{ id: 2, codigo: 'geral', nome: original.nome, publico: 'aluno', ativo: false }], headers })
    if (path === '/admin/campanhas/cpa-2025/formularios/geral/versoes') return route.fulfill({ json: [original], headers })
    if (path === '/admin/campanhas/cpa-2025/formularios/geral/versoes/1') return route.fulfill({ json: original, headers })
    if (path === '/admin/campanhas/cpa-2026/formularios/clonar' && method === 'POST') {
      expect(route.request().postDataJSON()).toMatchObject({ campanhaOrigem: 'cpa-2025', formularioOrigem: 'geral', versaoOrigem: 1, codigo: 'copia' })
      return route.fulfill({ status: 201, json: { codigo: 'copia', versao: 1 }, headers })
    }
    if (path === '/admin/campanhas/cpa-2026/formularios/copia/versoes/1') {
      if (method === 'PUT') {
        Object.assign(copy, route.request().postDataJSON())
        return route.fulfill({ status: 204, headers })
      }
      return route.fulfill({ json: copy, headers })
    }
    return route.fallback()
  })
  await page.goto('/admin/campanhas/cpa-2026/formularios')
  await page.getByRole('button', { name: 'Clonar de outra campanha' }).click()
  await page.getByLabel('Campanha de origem').selectOption('cpa-2025')
  await page.getByLabel('Formulário de origem').selectOption('geral')
  await page.getByLabel('Versão de origem').selectOption('1')
  await page.getByLabel('Código do novo formulário').fill('copia')
  await page.screenshot({ path: testInfo.outputPath('clonar-campanha-antiga.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Criar cópia em rascunho' }).click()
  await expect(page).toHaveURL(/\/copia\/versoes\/1$/)
  await expect(page.getByRole('textbox', { name: 'Texto', exact: true })).toHaveValue('Pergunta histórica')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Remover pergunta' }).click()
  await expect(page.getByRole('textbox', { name: 'Texto', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Publicar versão salva' })).toBeDisabled()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByText('Operação concluída.')).toBeVisible()
  await page.reload()
  await expect(page.getByText(/Nenhuma pergunta ativa/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publicar versão salva' })).toBeDisabled()
  await page.getByLabel('Mostrar perguntas desativadas').check()
  await expect(page.getByRole('textbox', { name: 'Texto', exact: true })).toHaveValue('Pergunta histórica')
  expect(copy.perguntas[0].id).toBe(30)
  expect(copy.perguntas[0].ativo).toBe(false)
  await page.goto('/admin/campanhas/cpa-2025/formularios/geral/versoes/1')
  await expect(page.getByRole('textbox', { name: 'Texto', exact: true })).toHaveValue('Pergunta histórica')
  await expect(page.getByRole('textbox', { name: 'Texto', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Remover pergunta' })).toBeVisible()
  expect(original.perguntas[0].ativo).toBe(true)
})

test('edita versão publicada sem clonar nem fechar a campanha aberta', async ({ page }, testInfo) => {
  const { version, campaigns } = await mockServices(page)
  await page.goto('/admin/campanhas/cpa-2026/formularios/geral/versoes/1')
  await expect(page.getByRole('note')).toContainText('mantendo o estado da campanha')
  await page.getByLabel('Nome', { exact: true }).fill('Avaliação atualizada')
  await page.getByLabel('Permitir comentário').check()
  await page.getByLabel('Aviso sobre o comentário').fill('Deixe seu comentário, se desejar.')
  await page.getByRole('textbox', { name: 'Texto', exact: true }).fill('Pergunta atualizada')
  await page.getByRole('textbox', { name: 'Rótulo', exact: true }).fill('Opção atualizada')
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  expect(version.nome).toBe('Avaliação institucional')
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('respostas anteriores passarão a referenciar o conteúdo modificado')
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Operação concluída.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Texto', exact: true })).toHaveValue('Pergunta atualizada')
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Avaliação atualizada')
  await expect(page.getByLabel('Permitir comentário')).toBeChecked()
  await expect(page.getByRole('button', { name: 'Publicar versão salva' })).toHaveCount(0)
  expect(version.id).toBe(1)
  expect(version.numero).toBe(1)
  expect(version.estado).toBe('PUBLICADA')
  expect(version.perguntas[0].id).toBe(1)
  expect(campaigns[0].estado).toBe('ABERTA')
  await page.screenshot({ path: testInfo.outputPath('editar-versao-publicada.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
