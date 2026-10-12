import { useEffect, useState } from 'react'

export function navigate(path: string) {
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}
export function useAdminData<T>(read: () => Promise<T>) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    read().then(value => { if (active) { setData(value); setError('') } }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : 'Falha ao carregar os dados.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [read, revision])
  return { data, error, loading, reload: () => { setLoading(true); setRevision(r => r + 1) } }
}
export function matches(item: { nome: string; codigo?: string; ativo: boolean }, search: string, status: string) {
  return (status === 'all' || item.ativo === (status === 'active')) && `${item.nome} ${item.codigo || ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
}
export function useAction(reload: () => void) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const run = async (action: () => Promise<unknown>, confirmation?: string) => {
    if (busy || (confirmation && !window.confirm(confirmation))) return false
    setBusy(true); setMessage('')
    try { await action(); setMessage('Operação concluída.'); reload(); return true }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Não foi possível concluir a operação.'); return false }
    finally { setBusy(false) }
  }
  return { busy, message, run }
}
