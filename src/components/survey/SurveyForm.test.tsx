import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CatalogForm } from '../../lib/survey-types'
import { fetchCatalog, fetchFormCourses } from '../../services/catalog-api'
import {
  confirmEmailVerification,
  requestEmailVerification,
  fetchAccessConfiguration,
  authorizeMasterKey,
  EmailVerificationError,
} from '../../services/email-verification-api'
import { fetchCampaignPublicState } from '../../services/campaign-state-api'
import { submitSurvey } from '../../services/survey-api'
import { SurveyForm } from './SurveyForm'

vi.mock('../../services/catalog-api', () => ({
  fetchCatalog: vi.fn(),
  fetchFormCourses: vi.fn(),
}))
vi.mock('../../services/email-verification-api', async importOriginal => ({
  ...await importOriginal<typeof import('../../services/email-verification-api')>(),
  confirmEmailVerification: vi.fn(),
  requestEmailVerification: vi.fn(),
  fetchAccessConfiguration: vi.fn(),
  authorizeMasterKey: vi.fn(),
}))
vi.mock('../../services/campaign-state-api', () => ({ fetchCampaignPublicState: vi.fn() }))
vi.mock('../../services/survey-api', () => ({ submitSurvey: vi.fn() }))

const baseForm: Omit<CatalogForm, 'audience' | 'code' | 'name'> = {
  campaign: 'cpa-2026',
  version: 1,
  order: 1,
  scope: 'GERAL',
  commentAllowed: false,
  questions: [
    {
      id: 'q1',
      texto: 'A avaliação foi satisfatória?',
      options: [{ code: 'sim', label: 'Sim' }],
    },
  ],
}

const studentForm: CatalogForm = {
  ...baseForm,
  code: 'discente_gestao',
  name: 'Avaliação discente',
  audience: 'aluno',
}

const staffForm: CatalogForm = {
  ...baseForm,
  code: 'docente_gestao',
  name: 'Avaliação docente',
  audience: 'professor',
}

beforeEach(() => {
  vi.mocked(fetchAccessConfiguration).mockResolvedValue({ emailDisponivel: true, chaveMestraDisponivel: true })
  vi.mocked(authorizeMasterKey).mockResolvedValue({ submissionToken: 'master-proof' })
  vi.mocked(fetchCatalog).mockImplementation(async (participantType) =>
    participantType === 'aluno' ? [studentForm] : [staffForm],
  )
  vi.mocked(fetchFormCourses).mockResolvedValue([])
  vi.mocked(requestEmailVerification).mockResolvedValue({ verificationId: 7 })
  vi.mocked(confirmEmailVerification).mockResolvedValue({
    submissionToken: 'opaque-proof',
  })
  vi.mocked(fetchCampaignPublicState).mockResolvedValue({
    campaign: "cpa-2026",
    state: 'ABERTA',
    isOpen: true,
  })
  vi.mocked(submitSurvey).mockResolvedValue({
    ok: true,
    status: 200,
    message: 'Avaliação enviada com sucesso.',
  })
})

afterEach(() => {
  vi.clearAllMocks()
  cleanup()
})

function continueFromParticipant(roleName: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${roleName}`) }))
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

describe('SurveyForm', () => {
  it('revalida a campanha e bloqueia o POST quando ela encerra durante o preenchimento', async () => {
    vi.mocked(fetchCampaignPublicState).mockResolvedValueOnce({
      campaign: "cpa-2026",
      state: 'ENCERRADA',
      isOpen: false,
      unavailableMessage: 'A campanha está encerrada para respostas.',
    })

    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant('Estudante')
    fireEvent.click(await screen.findByRole('button', { name: /^Avaliação discente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Pesquisa' }))

    expect(await screen.findByText('A campanha está encerrada para respostas.')).not.toBeNull()
    expect(submitSurvey).not.toHaveBeenCalled()
  })

  it('keeps student submissions anonymous and blocks a double submission', async () => {
    let resolveSubmission: () => void = () => undefined
    vi.mocked(submitSurvey).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmission = () =>
            resolve({
              ok: true,
              status: 200,
              message: 'Avaliação enviada com sucesso.',
            })
        }),
    )
    render(<SurveyForm campaign="cpa-2026" />)

    continueFromParticipant('Estudante')
    expect(screen.queryByLabelText('CPF')).toBeNull()
    expect(screen.queryByLabelText('Matrícula')).toBeNull()

    fireEvent.click(await screen.findByRole('button', { name: /^Avaliação discente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))

    const finish = screen.getByRole('button', { name: 'Finalizar Pesquisa' })
    fireEvent.click(finish)
    fireEvent.click(finish)

    await waitFor(() => expect(submitSurvey).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(submitSurvey).mock.calls[0][0]
    expect(payload.respondent).toEqual({
      type: 'aluno',
      aceiteTermosCondicoesServico: true,
    })
    resolveSubmission()
    await screen.findByRole('heading', { name: 'Avaliação enviada' })
  })

  it('submits the staff category and opaque proof without e-mail or PIN', async () => {
    render(<SurveyForm campaign="cpa-2026" />)

    continueFromParticipant('Docente')
    await screen.findByText('Enviaremos um código para confirmar o acesso. Não informaremos se o endereço existe.')
    fireEvent.change(await screen.findByLabelText('E-mail institucional'), {
      target: { value: 'docente@femass.edu.br' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    fireEvent.change(await screen.findByLabelText('Código'), {
      target: { value: 'PIN-SECRETO' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Pesquisa' }))

    await waitFor(() => expect(submitSurvey).toHaveBeenCalledTimes(1))
    expect(requestEmailVerification).toHaveBeenCalledWith(
      'docente@femass.edu.br',
      'professor',
      staffForm,
    )
    expect(confirmEmailVerification).toHaveBeenCalledWith(7, 'PIN-SECRETO')
    expect(vi.mocked(submitSurvey).mock.calls[0][0].respondent).toEqual({
      type: 'professor',
      aceiteTermosCondicoesServico: true,
      emailVerificationToken: 'opaque-proof',
    })
  })

  it.each(['professor', 'funcionario'] as const)('acessa como %s com chave sem email e envia apenas autorização opaca', async publico => {
    const selectedForm = { ...staffForm, audience: publico }
    vi.mocked(fetchCatalog).mockResolvedValue([selectedForm])
    vi.mocked(fetchAccessConfiguration).mockResolvedValue({ emailDisponivel: false, chaveMestraDisponivel: true })
    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant(publico === 'professor' ? 'Docente' : 'Funcionário')
    await screen.findByText('Serviço de email indisponível')
    fireEvent.change(screen.getByLabelText('Chave mestra'), { target: { value: 'chave-secreta-teste' } })
    fireEvent.click(screen.getByRole('button', { name: 'Acessar com chave mestra' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Pesquisa' }))
    await waitFor(() => expect(submitSurvey).toHaveBeenCalledTimes(1))
    expect(authorizeMasterKey).toHaveBeenCalledWith('chave-secreta-teste', publico, selectedForm)
    expect(requestEmailVerification).not.toHaveBeenCalled()
    expect(vi.mocked(submitSurvey).mock.calls[0][0].respondent).toEqual({
      type: publico, aceiteTermosCondicoesServico: true, emailVerificationToken: 'master-proof',
    })
    expect(JSON.stringify(vi.mocked(submitSurvey).mock.calls)).not.toContain('chave-secreta-teste')
  })

  it('deixa email readonly após falha real de envio e permite recorrer à chave', async () => {
    vi.mocked(requestEmailVerification).mockRejectedValueOnce(new EmailVerificationError('service-unavailable', 503, 'Falha no serviço de email'))
    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant('Docente')
    await screen.findByText('Enviaremos um código para confirmar o acesso. Não informaremos se o endereço existe.')
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'docente@femass.edu.br' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    await screen.findByText('Serviço de email indisponível')
    expect((screen.getByLabelText('E-mail institucional') as HTMLInputElement).readOnly).toBe(true)
    fireEvent.change(screen.getByLabelText('Chave mestra'), { target: { value: 'segredo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Acessar com chave mestra' }))
    await screen.findByRole('button', { name: 'Sim' })
    expect(confirmEmailVerification).not.toHaveBeenCalled()
  })

  it('mantém o acesso bloqueado quando a chave é inválida', async () => {
    vi.mocked(authorizeMasterKey).mockRejectedValueOnce(new Error('Chave mestra inválida.'))
    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant('Docente')
    await screen.findByText('Enviaremos um código para confirmar o acesso. Não informaremos se o endereço existe.')
    fireEvent.change(screen.getByLabelText('Chave mestra'), { target: { value: 'errada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Acessar com chave mestra' }))
    await screen.findByText('Chave mestra inválida.')
    expect(screen.queryByRole('button', { name: 'Sim' })).toBeNull()
    expect(submitSurvey).not.toHaveBeenCalled()
  })

  it('shows only one opaque proof representation and keeps it out of URL/logs', async () => {
    const receipt = 'data:image/png;base64,ZmFrZS1xci1wcm9vZg=='
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(submitSurvey).mockResolvedValueOnce({
      ok: true,
      status: 200,
      message: 'Avaliação enviada com sucesso.',
      proof: { kind: 'qr', value: receipt, codigoDigestFinal: '000000abcf' },
    })

    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant('Estudante')
    fireEvent.click(await screen.findByRole('button', { name: /^Avaliação discente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Pesquisa' }))

    await screen.findByRole('heading', { name: 'Avaliação enviada' })
    expect(screen.getByText('Comprovante')).not.toBeNull()
    expect(screen.getByRole('img', { name: 'QR Code de confirmação da participação' })).not.toBeNull()
    expect(screen.getByText('000000abcf')).not.toBeNull()
    expect(screen.queryByText(receipt)).toBeNull()
    expect(window.location.href).not.toContain(receipt)
    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain(receipt)
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain(receipt)
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(receipt)

    consoleLog.mockRestore()
    consoleWarn.mockRestore()
    consoleError.mockRestore()
  })

  it('starts a new response from cached catalog instead of re-fetching progress state', async () => {
    vi.mocked(fetchCatalog).mockResolvedValueOnce([studentForm])

    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant('Estudante')
    fireEvent.click(await screen.findByRole('button', { name: /^Avaliação discente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Pesquisa' }))

    await screen.findByRole('heading', { name: 'Avaliação enviada' })
    fireEvent.click(screen.getByRole('button', { name: 'Nova resposta' }))

    expect(await screen.findByRole('button', { name: /^Avaliação discente/ })).not.toBeNull()
    expect(vi.mocked(fetchCatalog)).toHaveBeenCalledTimes(1)
  })
})
