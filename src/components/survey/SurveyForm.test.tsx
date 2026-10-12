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
import { submitSurvey, fetchStudentProgress } from '../../services/survey-api'
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
vi.mock('../../services/survey-api', () => ({ submitSurvey: vi.fn(), fetchStudentProgress: vi.fn() }))

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
  vi.mocked(fetchStudentProgress).mockImplementation(async () => {
    const catalog = await vi.mocked(fetchCatalog).mock.results.at(-1)?.value as CatalogForm[] ?? [studentForm]
    const completed = new Set<string>()
    let proof
    for (let i = 0; i < vi.mocked(submitSurvey).mock.calls.length; i++) {
      const payload = vi.mocked(submitSurvey).mock.calls[i][0]
      const result = await vi.mocked(submitSurvey).mock.results[i].value
      if (result.ok || result.code === 'FORMULARIO_JA_RESPONDIDO') completed.add(`${payload.form}:${payload.formVersion}`)
      if (result.proof) proof = result.proof
    }
    const formularios = catalog.map(f => ({ code: f.code, version: f.version, respondido: completed.has(`${f.code}:${f.version}`) }))
    return { formularios, concluida: formularios.every(f => f.respondido), proof: proof ?? { kind: 'qr', value: 'campaign-receipt', codigoDigestFinal: '012345abcd' } }
  })
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
  if (roleName === 'Estudante') {
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '52998224725' } })
    fireEvent.change(screen.getByLabelText('Matrícula'), { target: { value: '0001234567' } })
  }
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

async function chooseStaffForm(name = 'Avaliação docente') {
  await screen.findByRole('heading', { name: 'Selecione a avaliação' })
  expect(screen.queryByRole('button', { name: 'Sim' })).toBeNull()
  expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

describe('SurveyForm', () => {
  it('impede escolher o último formulário, mantém a ordem e exibe somente o comprovante da campanha', async () => {
    const second = { ...studentForm, code: 'segundo', name: 'Segunda avaliação', order: 2 }
    vi.mocked(fetchCatalog).mockResolvedValue([studentForm, second])
    vi.mocked(submitSurvey).mockResolvedValue({ ok: true, status: 200, message: 'Salvo', proof: { kind: 'qr', value: 'proof-do-formulario' } })
    const progress = [
      { formularios: [studentForm, second].map(f => ({ code: f.code, version: f.version, respondido: false })), concluida: false },
      { formularios: [{ code: studentForm.code, version: 1, respondido: true }, { code: second.code, version: 1, respondido: false }], concluida: false },
      { formularios: [studentForm, second].map(f => ({ code: f.code, version: f.version, respondido: true })), concluida: true, proof: { kind: 'qr' as const, value: 'proof-da-campanha', codigoDigestFinal: '012345abcd' } },
    ]
    vi.mocked(fetchStudentProgress).mockReset()
    for (const item of progress) vi.mocked(fetchStudentProgress).mockResolvedValueOnce(item)
    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant('Estudante')
    await screen.findByRole('heading', { name: 'Sua sequência de avaliações' })
    expect((screen.getByRole('button', { name: /^Segunda avaliação/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Próxima etapa' }))
    await screen.findByRole('heading', { name: 'Segunda avaliação' })
    expect(screen.queryByRole('img', { name: 'QR Code de confirmação da participação' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Pesquisa' }))
    await screen.findByRole('heading', { name: 'Avaliação enviada' })
    expect(screen.getByText('012345abcd')).not.toBeNull()
    expect(vi.mocked(submitSurvey).mock.calls.map(([payload]) => payload.form)).toEqual([studentForm.code, second.code])
    expect(vi.mocked(window.scrollTo)).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
  })
  it('retoma apenas o formulário pendente depois de recarregar sem reenviar os concluídos', async () => {
    const second = { ...studentForm, code: 'segundo', name: 'Segunda avaliação', order: 2 }
    vi.mocked(fetchCatalog).mockResolvedValue([studentForm, second])
    vi.mocked(fetchStudentProgress).mockResolvedValue({ formularios: [{ code: studentForm.code, version: 1, respondido: true }, { code: second.code, version: 1, respondido: false }], concluida: false })
    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant('Estudante')
    await screen.findByRole('heading', { name: 'Sua sequência de avaliações' })
    expect(screen.getByText('Concluído')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByRole('heading', { name: 'Segunda avaliação' })
    expect(submitSurvey).not.toHaveBeenCalled()
  })
  it('falha ao consultar progresso após envio não libera QR nem repete POST; recuperação prossegue', async () => {
    const query = vi.mocked(fetchStudentProgress).getMockImplementation()!
    vi.mocked(fetchStudentProgress).mockReset().mockImplementationOnce(query).mockRejectedValueOnce(new Error('Sem conexão')).mockImplementation(query)
    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant('Estudante')
    await screen.findByRole('heading', { name: 'Sua sequência de avaliações' })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Pesquisa' }))
    await screen.findByText('Sem conexão')
    expect(submitSurvey).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('img', { name: 'QR Code de confirmação da participação' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Finalizar Pesquisa' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Verificar progresso' }))
    await screen.findByRole('heading', { name: 'Avaliação enviada' })
    expect(submitSurvey).toHaveBeenCalledTimes(1)
  })
  it('exige identificação válida somente para aluno e limpa ao mudar público', async () => {
    render(<SurveyForm campaign="cpa-2026" />)
    fireEvent.click(screen.getByRole('button', { name: /^Estudante/ }))
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '11111111111' } })
    fireEvent.change(screen.getByLabelText('Matrícula'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Informe um CPF válido.')).not.toBeNull()
    expect(screen.getByText('Informe uma matrícula com 10 dígitos.')).not.toBeNull()
    expect(fetchCatalog).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^Docente/ }))
    expect(screen.queryByLabelText('CPF')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Estudante/ }))
    expect((screen.getByLabelText('CPF') as HTMLInputElement).value).toBe('')
  })

  it('retoma a sequência após conflito e não mostra QR antes de concluir todas as versões', async () => {
    vi.mocked(fetchCatalog).mockResolvedValue([studentForm, { ...studentForm, version: 2, name: 'Nova versão' }])
    vi.mocked(submitSurvey).mockResolvedValueOnce({ ok: false, status: 409, code: 'FORMULARIO_JA_RESPONDIDO', message: 'Duplicado' })
    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant('Estudante')
    fireEvent.click(await screen.findByRole('button', { name: /^Avaliação discente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Próxima etapa' }))
    await screen.findByRole('heading', { name: 'Nova versão' })
    expect(screen.queryByRole('img', { name: 'QR Code de confirmação da participação' })).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Pesquisa' }))
    await waitFor(() => expect(submitSurvey).toHaveBeenCalledTimes(2))
    expect(vi.mocked(submitSurvey).mock.calls[1][0]).toMatchObject({ formVersion: 2, respondent: { cpf: '52998224725', matricula: '0001234567' } })
  })
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

  it('envia identificação do aluno apenas no POST e bloqueia duplo clique', async () => {
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
    expect((screen.getByLabelText('CPF') as HTMLInputElement).value).toBe('529.982.247-25')
    expect((screen.getByLabelText('Matrícula') as HTMLInputElement).value).toBe('0001234567')

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
      cpf: '52998224725',
      matricula: '0001234567',
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
    await chooseStaffForm()
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
    await chooseStaffForm()
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
    await chooseStaffForm()
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
    expect(screen.queryByRole('heading', { name: 'Selecione a avaliação' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sim' })).toBeNull()
    expect(submitSurvey).not.toHaveBeenCalled()
  })

  it.each([
    ['professor', 'email'], ['professor', 'chave'],
    ['funcionario', 'email'], ['funcionario', 'chave'],
  ] as const)('%s escolhe qualquer formulário após verificar %s e pode voltar sem autenticar novamente', async (publico, access) => {
    const first = { ...staffForm, audience: publico, scope: 'DISCIPLINA' as const }
    const second = { ...staffForm, audience: publico, code: 'instituicao', name: 'Avaliação institucional', version: 2,
      questions: [{ ...staffForm.questions[0], texto: 'Pergunta do formulário escolhido' }] }
    vi.mocked(fetchCatalog).mockResolvedValue([first, second])
    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant(publico === 'professor' ? 'Docente' : 'Funcionário')
    await screen.findByText('Enviaremos um código para confirmar o acesso. Não informaremos se o endereço existe.')
    expect(screen.queryByRole('heading', { name: 'Selecione a avaliação' })).toBeNull()
    if (access === 'email') {
      fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'docente@femass.edu.br' } })
      fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
      fireEvent.change(await screen.findByLabelText('Código'), { target: { value: 'PIN-TESTE' } })
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar código' }))
    } else {
      fireEvent.change(screen.getByLabelText('Chave mestra'), { target: { value: 'segredo' } })
      fireEvent.click(screen.getByRole('button', { name: 'Acessar com chave mestra' }))
    }
    await chooseStaffForm('Avaliação institucional')
    await screen.findByText('Pergunta do formulário escolhido')
    expect(fetchFormCourses).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('button', { name: /^Avaliação docente/ })).not.toBeNull()
    expect(screen.getByRole('button', { name: /^Avaliação institucional/ })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Avaliação docente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByRole('heading', { name: 'Selecione seu Curso' })
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('heading', { name: 'Selecione a avaliação' })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Avaliação institucional/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Pesquisa' }))
    await waitFor(() => expect(submitSurvey).toHaveBeenCalledTimes(1))
    expect(vi.mocked(submitSurvey).mock.calls[0][0]).toMatchObject({ form: 'instituicao', formVersion: 2,
      respondent: { type: publico, emailVerificationToken: access === 'email' ? 'opaque-proof' : 'master-proof' } })
    expect(access === 'email' ? confirmEmailVerification : authorizeMasterKey).toHaveBeenCalledTimes(1)
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

  it('volta à identificação do aluno para consultar o progresso ao iniciar novamente', async () => {
    vi.mocked(fetchCatalog).mockResolvedValueOnce([studentForm])

    render(<SurveyForm campaign="cpa-2026" />)
    continueFromParticipant('Estudante')
    fireEvent.click(await screen.findByRole('button', { name: /^Avaliação discente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Pesquisa' }))

    await screen.findByRole('heading', { name: 'Avaliação enviada' })
    fireEvent.click(screen.getByRole('button', { name: 'Nova resposta' }))

    fireEvent.click(screen.getByRole('button', { name: /^Estudante/ }))
    expect((screen.getByLabelText('CPF') as HTMLInputElement).value).toBe('')
    continueFromParticipant('Estudante')
    await screen.findByRole('heading', { name: 'Avaliação enviada' })
    expect(vi.mocked(submitSurvey)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(fetchStudentProgress)).toHaveBeenCalledTimes(3)
  })
})
