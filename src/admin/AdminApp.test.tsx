import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import App from '../App'

const auth = vi.hoisted(() => ({ initialize: vi.fn(), login: vi.fn(), logout: vi.fn() }))
vi.mock('./auth', () => ({ initializeAdminAuth: auth.initialize, loginAdmin: auth.login, logoutAdmin: auth.logout }))
vi.mock('../app/SurveyPage', () => ({ SurveyPage: () => <h1>Pesquisa pública</h1> }))
vi.mock('./AcademicPage', () => ({ AcademicPage: ({ kind }: { kind: string }) => <h1>Cadastro: {kind}</h1> }))
vi.mock('./CampaignsPage', () => ({ CampaignsPage: () => <h1>Campanhas</h1>, CampaignDetail: ({ campaign }: { campaign: string }) => <h1>Campanha: {campaign}</h1> }))
vi.mock('./FormsPage', () => ({ FormsPage: () => <h1>Formulários</h1>, VersionPage: ({ number }: { number: number }) => <h1>Versão: {number}</h1> }))

describe('acesso ao painel', () => {
  beforeEach(() => { vi.clearAllMocks(); auth.initialize.mockResolvedValue({ authenticated: true, hasRealmRole: () => true, tokenParsed: { preferred_username: 'comissao' } }); window.scrollTo = vi.fn() })
  afterEach(cleanup)
  it('não inicializa o login na pesquisa pública', () => {
    window.history.replaceState(null, '', '/')
    render(<App />)
    expect(screen.getByText('Pesquisa pública')).toBeInTheDocument()
    expect(auth.initialize).not.toHaveBeenCalled()
  })
  it('protege um endereço direto e permite navegação após autenticação', async () => {
    window.history.replaceState(null, '', '/admin/campanhas/cpa-2026/formularios/geral/versoes/2')
    render(<App />)
    expect(screen.queryByText('Versão: 2')).not.toBeInTheDocument()
    await screen.findByText('Versão: 2')
    expect(screen.getByText('comissao')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Cursos' }))
    await screen.findByText('Cadastro: cursos')
    expect(window.location.pathname).toBe('/admin/cursos')
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(auth.logout).toHaveBeenCalledOnce()
  })
  it('nega acesso a usuário sem cpa-admin', async () => {
    auth.initialize.mockResolvedValue({ authenticated: true, hasRealmRole: () => false })
    window.history.replaceState(null, '', '/admin/cursos')
    render(<App />)
    await screen.findByRole('heading', { name: 'Acesso negado' })
    expect(screen.queryByText('Cadastro: cursos')).not.toBeInTheDocument()
  })
  it('remove os cadastros da tela ao expirar a sessão', async () => {
    window.history.replaceState(null, '', '/admin/cursos')
    render(<App />)
    await screen.findByText('Cadastro: cursos')
    window.dispatchEvent(new Event('admin-session-expired'))
    await screen.findByRole('heading', { name: 'Sessão expirada' })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar novamente' }))
    expect(auth.login).toHaveBeenCalledOnce()
    expect(screen.queryByText('Cadastro: cursos')).not.toBeInTheDocument()
  })
  it('apresenta falha de configuração sem expor as páginas', async () => {
    auth.initialize.mockRejectedValue(new Error('Configure o Keycloak'))
    window.history.replaceState(null, '', '/admin')
    render(<App />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Configure o Keycloak'))
    expect(screen.queryByText('Painel administrativo')).not.toBeInTheDocument()
  })
})
