import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from './api'
import { adminToken, expireAdminSession } from './auth'

vi.mock('./auth', () => ({ adminToken: vi.fn(), expireAdminSession: vi.fn() }))
const fetchMock = vi.fn()
describe('cliente administrativo', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', fetchMock); vi.mocked(adminToken).mockResolvedValue('token-renovado') })
  afterEach(() => vi.unstubAllGlobals())
  it('renova o token e envia Bearer e JSON sem repetir escritas', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'Código duplicado' }), { status: 409 }))
    await expect(adminApi('/cursos', 'POST', { nome: 'Curso' })).rejects.toThrow('Código duplicado')
    expect(adminToken).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer token-renovado', 'Content-Type': 'application/json' }, body: '{"nome":"Curso"}' })
  })
  it('encerra a sessão ao receber 401', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
    await expect(adminApi('/cursos')).rejects.toThrow('sessão expirou')
    expect(expireAdminSession).toHaveBeenCalledOnce()
  })
  it('notifica o painel ao receber 403', async () => {
    const denied = vi.fn(); window.addEventListener('admin-access-denied', denied)
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }))
    await expect(adminApi('/cursos')).rejects.toThrow('Acesso negado')
    expect(denied).toHaveBeenCalledOnce()
    window.removeEventListener('admin-access-denied', denied)
  })
  it('não envia a requisição quando a renovação falha', async () => {
    vi.mocked(adminToken).mockRejectedValue(new Error('Sessão expirada'))
    await expect(adminApi('/cursos', 'PUT', {})).rejects.toThrow('Sessão expirada')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('aceita respostas sem conteúdo', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(adminApi('/cursos/1/status', 'PATCH', { ativo: false })).resolves.toBeUndefined()
  })
})
