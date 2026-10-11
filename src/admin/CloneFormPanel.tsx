import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi, segment } from './api'
import { useAdminData } from './hooks'
import type { AdminForm, Campaign, CloneFormInput, Version } from './types'
import { Notice } from './ui'

export function CloneFormPanel({ campaign, busy, onCancel, onSave }: {
  campaign: string; busy: boolean; onCancel: () => void; onSave: (dto: CloneFormInput) => Promise<void>
}) {
  const read = useCallback(() => adminApi<Campaign[]>('/campanhas'), [])
  const { data, error, loading, reload } = useAdminData(read)
  const [origin, setOrigin] = useState('')
  return <section className="admin-editor"><h2>Clonar formulário de outra campanha</h2>
    <p>A versão selecionada será copiada para um novo formulário em rascunho. A campanha de origem e suas respostas serão preservadas.</p>
    {error && <Notice>{error} <button onClick={reload}>Tentar novamente</button></Notice>}
    {loading ? <p role="status">Carregando campanhas de origem…</p> : <label>Campanha de origem<select disabled={busy} value={origin} onChange={e => setOrigin(e.target.value)}>
      <option value="">Selecione uma campanha</option>{data?.filter(c => c.codigo !== campaign).map(c => <option key={c.id} value={c.codigo}>{c.nome} ({c.codigo}) · {c.estado}{!c.ativo && ' · Inativa'}</option>)}
    </select></label>}
    {origin && <SourceForms key={origin} origin={origin} busy={busy} onSave={onSave} />}
    <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar clonagem</button>
  </section>
}

function SourceForms({ origin, busy, onSave }: { origin: string; busy: boolean; onSave: (dto: CloneFormInput) => Promise<void> }) {
  const read = useCallback(() => adminApi<AdminForm[]>(`/campanhas/${segment(origin)}/formularios`), [origin])
  const { data, error, loading, reload } = useAdminData(read)
  const [form, setForm] = useState('')
  return <>
    {error && <Notice>{error} <button onClick={reload}>Tentar novamente</button></Notice>}
    {loading ? <p role="status">Carregando formulários de origem…</p> : <label>Formulário de origem<select disabled={busy} value={form} onChange={e => setForm(e.target.value)}>
      <option value="">Selecione um formulário</option>{data?.map(f => <option key={f.id} value={f.codigo}>{f.nome} ({f.codigo}){!f.ativo && ' · Inativo'}</option>)}
    </select></label>}
    {!loading && !error && !data?.length && <p>Esta campanha não possui formulários.</p>}
    {form && <SourceVersions key={form} origin={origin} form={form} busy={busy} onSave={onSave} />}
  </>
}

function SourceVersions({ origin, form, busy, onSave }: { origin: string; form: string; busy: boolean; onSave: (dto: CloneFormInput) => Promise<void> }) {
  const read = useCallback(() => adminApi<Version[]>(`/campanhas/${segment(origin)}/formularios/${segment(form)}/versoes`), [origin, form])
  const { data, error, loading, reload } = useAdminData(read)
  const [number, setNumber] = useState('')
  const [code, setCode] = useState(form)
  const [name, setName] = useState('')
  const version = data?.find(v => String(v.numero) === number)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (version && !busy) void onSave({ campanhaOrigem: origin, formularioOrigem: form, versaoOrigem: version.numero, codigo: code, nome: name })
  }
  return <form onSubmit={submit}>
    {error && <Notice>{error} <button type="button" onClick={reload}>Tentar novamente</button></Notice>}
    {loading ? <p role="status">Carregando versões de origem…</p> : <fieldset disabled={busy}>
      <label>Versão de origem<select required value={number} onChange={e => { setNumber(e.target.value); setName(data?.find(v => String(v.numero) === e.target.value)?.nome || '') }}>
        <option value="">Selecione uma versão</option>{data?.map(v => <option key={v.id} value={v.numero}>Versão {v.numero} · {v.estado}{!v.ativo && ' · Inativa'}</option>)}
      </select></label>
      {version && <><p>{version.perguntas.filter(p => p.ativo).length} pergunta(s) ativa(s). Perguntas e opções desativadas também serão preservadas na cópia.</p>
        <div className="admin-grid"><label>Código do novo formulário<input required maxLength={60} value={code} onChange={e => setCode(e.target.value)} /></label>
          <label>Nome do novo formulário<input required maxLength={180} value={name} onChange={e => setName(e.target.value)} /></label></div></>}
      <div className="admin-actions"><button disabled={!version || busy}>{busy ? 'Clonando…' : 'Criar cópia em rascunho'}</button></div>
    </fieldset>}
  </form>
}
