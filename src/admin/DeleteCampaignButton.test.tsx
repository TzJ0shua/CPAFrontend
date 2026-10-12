import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { DeleteCampaignButton } from './DeleteCampaignButton'
import { adminApi } from './api'

vi.mock('./api', () => ({ adminApi: vi.fn(), segment: encodeURIComponent }))
const preview = { id: 9, codigo: 'antiga', nome: 'Campanha antiga', formularios: 1, versoes: 2, perguntas: 4, opcoes: 8, avaliacoes: 3, respostas: 6, validacoes: 3, autorizacoes: 2 }
beforeEach(() => {
  vi.mocked(adminApi).mockReset()
  vi.mocked(adminApi).mockImplementation(async (_path, method) => method === 'DELETE' ? undefined : preview)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => vi.restoreAllMocks())
describe('exclusão de campanhas', () => {
  it.each([0, 6])('informa as %i respostas e só exclui após confirmação', async respostas => {
    const current = { ...preview, respostas }
    vi.mocked(adminApi).mockResolvedValueOnce(current).mockResolvedValueOnce(undefined)
    const done = vi.fn()
    render(<DeleteCampaignButton campaign="antiga" onDeleted={done} />)
    fireEvent.click(screen.getByRole('button', { name: 'Excluir campanha' }))
    await waitFor(() => expect(done).toHaveBeenCalledTimes(1))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining(respostas ? 'Há 6 resposta(s)' : 'Não há respostas atreladas'))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('apagados definitivamente'))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('QR Codes'))
    expect(adminApi).toHaveBeenNthCalledWith(1, '/campanhas/antiga/exclusao')
    expect(adminApi).toHaveBeenNthCalledWith(2, '/campanhas/antiga', 'DELETE', current)
  })
  it('cancelar não apaga nem navega', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const done = vi.fn()
    render(<DeleteCampaignButton campaign="antiga" onDeleted={done} />)
    fireEvent.click(screen.getByRole('button', { name: 'Excluir campanha' }))
    await waitFor(() => expect(window.confirm).toHaveBeenCalled())
    expect(adminApi).toHaveBeenCalledTimes(1)
    expect(done).not.toHaveBeenCalled()
  })
  it('falha na consulta impede confirmação e exclusão', async () => {
    vi.mocked(adminApi).mockRejectedValueOnce(new Error('Falha ao consultar respostas'))
    render(<DeleteCampaignButton campaign="antiga" onDeleted={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Excluir campanha' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao consultar respostas')
    expect(window.confirm).not.toHaveBeenCalled()
    expect(adminApi).toHaveBeenCalledTimes(1)
  })
  it('exige nova confirmação após conflito, sem repetir DELETE automaticamente', async () => {
    vi.mocked(adminApi).mockResolvedValueOnce(preview).mockRejectedValueOnce(new Error('Os dados da campanha mudaram. Consulte a exclusão e confirme novamente.'))
    const done = vi.fn()
    render(<DeleteCampaignButton campaign="antiga" onDeleted={done} />)
    fireEvent.click(screen.getByRole('button', { name: 'Excluir campanha' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('confirme novamente')
    expect(adminApi).toHaveBeenCalledTimes(2)
    expect(done).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir campanha' }))
    await waitFor(() => expect(done).toHaveBeenCalledTimes(1))
    expect(window.confirm).toHaveBeenCalledTimes(2)
    expect(adminApi).toHaveBeenCalledTimes(4)
  })
  it('bloqueia cliques repetidos enquanto consulta o resumo', async () => {
    let resolve!: (value: typeof preview) => void
    vi.mocked(adminApi).mockImplementationOnce(() => new Promise(r => { resolve = r }))
    render(<DeleteCampaignButton campaign="antiga" onDeleted={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Excluir campanha' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button).toBeDisabled()
    expect(adminApi).toHaveBeenCalledTimes(1)
    resolve(preview)
    await waitFor(() => expect(adminApi).toHaveBeenCalledTimes(2))
  })
})
