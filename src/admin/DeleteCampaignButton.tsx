import { useRef, useState } from 'react'
import { adminApi, segment } from './api'
import type { CampaignDeletionPreview } from './types'
import { Notice } from './ui'

export function DeleteCampaignButton({ campaign, disabled = false, onDeleted }: { campaign: string; disabled?: boolean; onDeleted: () => void }) {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const remove = async () => {
    if (pending.current || disabled) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const path = `/campanhas/${segment(campaign)}`
      const preview = await adminApi<CampaignDeletionPreview>(`${path}/exclusao`)
      const responses = preview.respostas > 0
        ? `Há ${preview.respostas} resposta(s) atrelada(s) a esta campanha.`
        : 'Não há respostas atreladas a esta campanha.'
      const message = `Excluir a campanha "${preview.nome}" (${preview.codigo})?\n\n${responses}\n\nSerão apagados definitivamente a campanha e todos os seus formulários, versões, perguntas, opções, avaliações, respostas, comprovantes (QR Codes) e autorizações de acesso.\n\nResumo: ${preview.formularios} formulário(s), ${preview.versoes} versão(ões), ${preview.avaliacoes} avaliação(ões), ${preview.respostas} resposta(s) e ${preview.validacoes} comprovante(s). Os comprovantes vinculados deixarão de funcionar.\n\nEssa ação não pode ser desfeita. Deseja continuar?`
      if (!window.confirm(message)) return
      await adminApi(path, 'DELETE', preview)
      onDeleted()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir a campanha.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return <div><button className="danger" disabled={disabled || busy} onClick={() => void remove()}>{busy ? 'Excluindo…' : 'Excluir campanha'}</button>{error && <Notice>{error}</Notice>}</div>
}
