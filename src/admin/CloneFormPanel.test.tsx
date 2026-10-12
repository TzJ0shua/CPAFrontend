import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { CloneFormPanel } from './CloneFormPanel'
import { adminApi } from './api'

vi.mock('./api', () => ({ adminApi: vi.fn(), segment: encodeURIComponent }))
const version = { id: 10, numero: 2, nome: 'Pesquisa histórica', estado: 'PUBLICADA', ativo: false, perguntas: [{ ativo: true }] }
beforeEach(() => {
  vi.mocked(adminApi).mockImplementation(async path => {
    if (path === '/campanhas') return [{ id: 1, codigo: 'antiga', nome: 'Campanha antiga', estado: 'ENCERRADA', ativo: false }, { id: 2, codigo: 'atual', nome: 'Campanha atual', estado: 'RASCUNHO', ativo: true }]
    if (path.endsWith('/formularios')) return [{ id: 3, codigo: 'geral', nome: 'Histórico', ativo: false }]
    if (path.endsWith('/versoes')) return [version]
    throw new Error('Consulta inesperada')
  })
})
describe('clonagem entre campanhas', () => {
  it('seleciona uma versão histórica e informa o código e nome da cópia', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<CloneFormPanel campaign="atual" busy={false} onSave={save} onCancel={vi.fn()} />)
    fireEvent.change(await screen.findByLabelText('Campanha de origem'), { target: { value: 'antiga' } })
    expect(screen.queryByRole('option', { name: /Campanha atual/ })).toBeNull()
    fireEvent.change(await screen.findByLabelText('Formulário de origem'), { target: { value: 'geral' } })
    fireEvent.change(await screen.findByLabelText('Versão de origem'), { target: { value: '2' } })
    expect(screen.getByLabelText('Nome do novo formulário')).toHaveValue('Pesquisa histórica')
    fireEvent.change(screen.getByLabelText('Código do novo formulário'), { target: { value: 'copia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar cópia em rascunho' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith({ campanhaOrigem: 'antiga', formularioOrigem: 'geral', versaoOrigem: 2, codigo: 'copia', nome: 'Pesquisa histórica' }))
    fireEvent.change(screen.getByLabelText('Campanha de origem'), { target: { value: '' } })
    expect(screen.queryByLabelText('Versão de origem')).toBeNull()
    expect(screen.queryByLabelText('Código do novo formulário')).toBeNull()
  })
  it('exibe falhas da consulta sem permitir criar uma cópia', async () => {
    vi.mocked(adminApi).mockRejectedValue(new Error('Falha ao carregar campanhas'))
    render(<CloneFormPanel campaign="atual" busy={false} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(await screen.findByText('Falha ao carregar campanhas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Criar cópia em rascunho' })).toBeNull()
  })
})
