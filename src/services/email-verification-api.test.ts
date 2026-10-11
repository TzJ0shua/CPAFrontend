import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  EmailVerificationError,
  confirmEmailVerification,
  requestEmailVerification,
  fetchAccessConfiguration,
  authorizeMasterKey,
} from './email-verification-api'
import type { CatalogForm } from '../lib/survey-types'

const form: CatalogForm = {
  campaign: 'cpa-2026',
  code: 'docente_gestao',
  name: 'Docentes',
  audience: 'professor',
  version: 1,
  order: 1,
  scope: 'GERAL',
  commentAllowed: false,
  questions: [],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('email verification API', () => {
  it('consulta configuração sem cache e não aceita resposta incompleta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ emailDisponivel: false, chaveMestraDisponivel: true })))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchAccessConfiguration()).resolves.toEqual({ emailDisponivel: false, chaveMestraDisponivel: true })
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store')
    fetchMock.mockResolvedValue(new Response('{}'))
    await expect(fetchAccessConfiguration()).rejects.toMatchObject({ code: 'service-unavailable' })
  })

  it('valida chave uma única vez com campanha e público e trata rejeição', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ submissionToken: 'token' })))
    vi.stubGlobal('fetch', fetchMock)
    await expect(authorizeMasterKey('segredo', 'professor', form)).resolves.toEqual({ submissionToken: 'token' })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ chave: 'segredo', publico: 'professor', campaign: 'cpa-2026', form: 'docente_gestao', formVersion: 1 })
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }))
    await expect(authorizeMasterKey('errada', 'professor', form)).rejects.toMatchObject({ code: 'invalid-master-key' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    fetchMock.mockRejectedValue(new TypeError('network'))
    await expect(authorizeMasterKey('segredo', 'professor', form)).rejects.toMatchObject({ code: 'network' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
  it('sends the institutional-email request exactly once', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ verificationId: 42 }), { status: 202 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      requestEmailVerification('docente@femass.edu.br', 'professor', form),
    ).resolves.toEqual({ verificationId: 42 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/verificacao-email/solicitar')
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'docente@femass.edu.br',
      publico: 'professor',
      campaign: 'cpa-2026',
      form: 'docente_gestao',
      formVersion: 1,
    })
  })

  it('does not retry a failed PIN confirmation', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network unavailable'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(confirmEmailVerification(42, 'PIN-SECRETO')).rejects.toMatchObject({
      code: 'network',
      status: 0,
    } satisfies Partial<EmailVerificationError>)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('turns expiry and resend limits into safe, actionable messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })))
    await expect(
      requestEmailVerification('docente@femass.edu.br', 'professor', form),
    ).rejects.toMatchObject({
      code: 'resend-limit',
      message: expect.stringContaining('limite de reenvios'),
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 400 })))
    await expect(confirmEmailVerification(42, 'PIN-SECRETO')).rejects.toMatchObject({
      code: 'invalid-or-expired-pin',
      message: expect.stringContaining('expirou'),
    })
  })
})
