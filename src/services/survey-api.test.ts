import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitSurvey } from './survey-api'
import type { SurveyApiPayload } from '../lib/survey-types'

const payload: SurveyApiPayload = {
  campaign: 'cpa-2026',
  form: 'discente_gestao',
  formVersion: 1,
  submittedAt: '2026-10-03T12:00:00.000Z',
  respondent: { type: 'aluno', aceiteTermosCondicoesServico: true, cpf: '52998224725', matricula: '0001234567' },
  answers: [{ questionId: 'q1', optionCode: 'concordo_totalmente' }],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('submitSurvey', () => {
  it('trata código de duplicidade sem expor a mensagem arbitrária do servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'FORMULARIO_JA_RESPONDIDO', error: 'cpf secreto' }), { status: 409 })))
    await expect(submitSurvey(payload)).resolves.toEqual({ ok: false, status: 409, code: 'FORMULARIO_JA_RESPONDIDO', message: 'Você já respondeu esta versão do formulário nesta campanha.' })
  })
  it('preserves the digest suffix beside the original QR content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      qrCode: 'opaque-qr-code',
      codigoDigestFinal: '000000abcf',
    }), { status: 200 })))

    await expect(submitSurvey(payload)).resolves.toMatchObject({
      proof: { kind: 'qr', value: 'opaque-qr-code', codigoDigestFinal: '000000abcf' },
    })
  })

  it.each(['a'.repeat(64), 'invalid', '123456789'])('does not expose an invalid or full digest: %s', async (codigoDigestFinal) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      qrCode: 'opaque-qr-code', codigoDigestFinal,
    }), { status: 200 })))

    const result = await submitSurvey(payload)
    expect(result.proof).toEqual({ kind: 'qr', value: 'opaque-qr-code' })
  })

  it('envia identificação no corpo do POST uma única vez', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitSurvey(payload)).resolves.toMatchObject({ ok: true, status: 200 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body.respondent).toEqual(payload.respondent)
    expect(String(fetchMock.mock.calls[0][0])).not.toMatch(/52998224725|0001234567/)
  })

  it('does not replay a submission after a network failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network unavailable'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitSurvey(payload)).resolves.toMatchObject({ ok: false, status: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sanitizes backend errors and does not expose raw sensitive payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'CPF 00011122233, token segredo' }), {
          status: 400,
        }),
      ),
    )

    await expect(submitSurvey(payload)).resolves.toEqual({
      ok: false,
      status: 400,
      message: 'Não foi possível enviar a avaliação.',
    })
  })

  it('treats the backend proof as opaque and prefers QR over text when both are present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'ok',
            receipt: 'opaque-token',
            qrCode: 'data:image/png;base64,abc',
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(submitSurvey(payload)).resolves.toEqual({
      ok: true,
      status: 200,
      message: 'Avaliação enviada com sucesso.',
      proof: {
        kind: 'qr',
        value: 'data:image/png;base64,abc',
      },
    })
  })
})
