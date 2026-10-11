import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAccessConfiguration } from '../../../services/email-verification-api'
vi.mock('../../../services/email-verification-api', () => ({ fetchAccessConfiguration: vi.fn() }))
beforeEach(() => { vi.mocked(fetchAccessConfiguration).mockResolvedValue({ emailDisponivel: true, chaveMestraDisponivel: true }) })
import { EmailVerificationStep } from './EmailVerificationStep'

describe('EmailVerificationStep', () => {
  it('bloqueia identificador institucional numerico antes do envio', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <EmailVerificationStep
        onBack={() => undefined}
        onSubmit={onSubmit}
        onMasterKey={vi.fn()}
        loading={false}
        error=""
      />,
    )

    await screen.findByText('Enviaremos um código para confirmar o acesso. Não informaremos se o endereço existe.')
    fireEvent.change(screen.getByLabelText('E-mail institucional'), {
      target: { value: '2301130025@femass.edu.br' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))

    expect(screen.getByRole('alert').textContent).toContain('sem matrícula antes do @')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('permite e-mail institucional nominal', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <EmailVerificationStep
        onBack={() => undefined}
        onSubmit={onSubmit}
        onMasterKey={vi.fn()}
        loading={false}
        error=""
      />,
    )

    await screen.findByText('Enviaremos um código para confirmar o acesso. Não informaremos se o endereço existe.')
    fireEvent.change(screen.getByLabelText('E-mail institucional'), {
      target: { value: 'nome.sobrenome@femass.edu.br' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))

    expect(onSubmit).toHaveBeenCalledWith('nome.sobrenome@femass.edu.br')
  })

  it('deixa email readonly sem serviço e permite a chave sem exigir email', async () => {
    vi.mocked(fetchAccessConfiguration).mockResolvedValue({ emailDisponivel: false, chaveMestraDisponivel: true })
    const onMasterKey = vi.fn().mockResolvedValue(undefined)
    const onSubmit = vi.fn()
    render(<EmailVerificationStep onBack={vi.fn()} onSubmit={onSubmit} onMasterKey={onMasterKey} loading={false} error="" />)
    await screen.findByText('Serviço de email indisponível')
    expect((screen.getByLabelText('E-mail institucional') as HTMLInputElement).readOnly).toBe(true)
    expect((screen.getByRole('button', { name: 'Enviar código' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Chave mestra'), { target: { value: 'segredo-teste' } })
    fireEvent.click(screen.getByRole('button', { name: 'Acessar com chave mestra' }))
    expect(onMasterKey).toHaveBeenCalledWith('segredo-teste')
    expect((screen.getByLabelText('Chave mestra') as HTMLInputElement).value).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('informa ausência da chave configurada e bloqueia o botão', async () => {
    vi.mocked(fetchAccessConfiguration).mockResolvedValue({ emailDisponivel: false, chaveMestraDisponivel: false })
    render(<EmailVerificationStep onBack={vi.fn()} onSubmit={vi.fn()} onMasterKey={vi.fn()} loading={false} error="" />)
    await screen.findByText('A chave mestra não foi configurada. Entre em contato com a comissão.')
    expect((screen.getByRole('button', { name: 'Acessar com chave mestra' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('permite repetir a consulta de configuração após uma falha de rede', async () => {
    vi.mocked(fetchAccessConfiguration).mockRejectedValueOnce(new Error('network'))
    render(<EmailVerificationStep onBack={vi.fn()} onSubmit={vi.fn()} onMasterKey={vi.fn()} loading={false} error="" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Verificar novamente' }))
    await screen.findByText('Enviaremos um código para confirmar o acesso. Não informaremos se o endereço existe.')
    expect((screen.getByLabelText('E-mail institucional') as HTMLInputElement).readOnly).toBe(false)
  })
})
