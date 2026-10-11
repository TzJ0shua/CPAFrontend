import { expect, test } from '@playwright/test'

test('lê a API da VPS e atualiza a configuração ao recarregar', async ({ page }) => {
  let api = 'http://127.0.0.1:8299'
  let calls = 0
  await page.route('**/runtime-config.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.__CPA_CONFIG__ = ${JSON.stringify({ VITE_API_BASE_URL: api })};`,
  }))
  await page.route(/http:\/\/127\.0\.0\.1:(8299|8300)\/campanhas\/atual\/disponibilidade/, route => {
    calls++
    return route.fulfill({ json: { campanha: null, estado: null, dataInicio: null, dataFim: null,
      disponivelParaResposta: false, mensagem: `Campanha indisponível em ${api}` } })
  })
  await page.goto('/')
  await expect(page.getByText('Campanha indisponível em http://127.0.0.1:8299')).toBeVisible()
  api = 'http://127.0.0.1:8300'
  await page.reload()
  await expect(page.getByText('Campanha indisponível em http://127.0.0.1:8300')).toBeVisible()
  expect(calls).toBe(2)
})

test('usa o Keycloak da VPS ao acessar diretamente uma página administrativa', async ({ page }) => {
  await page.route('**/runtime-config.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.__CPA_CONFIG__ = ${JSON.stringify({ VITE_KEYCLOAK_URL: 'http://127.0.0.1:8289', VITE_KEYCLOAK_REALM: 'vps', VITE_KEYCLOAK_CLIENT_ID: 'frontend-vps' })};`,
  }))
  await page.route('http://127.0.0.1:8289/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Login VPS</h1>' }))
  await page.goto('/admin/cursos')
  await expect(page.getByRole('heading', { name: 'Login VPS' })).toBeVisible()
  const login = new URL(page.url())
  expect(login.pathname).toBe('/realms/vps/protocol/openid-connect/auth')
  expect(login.searchParams.get('client_id')).toBe('frontend-vps')
  expect(login.searchParams.get('code_challenge_method')).toBe('S256')
  expect(login.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:5194/admin/cursos')
})
