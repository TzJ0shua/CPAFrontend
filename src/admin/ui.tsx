import { navigate } from './hooks'
import type { ReactNode } from 'react'

export function AdminLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} onClick={(event) => {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(href) }
  }}>{children}</a>
}
export function Notice({ children }: { children: ReactNode }) { return <p className="admin-notice" role="alert">{children}</p> }
export function StatusBadge({ ativo }: { ativo: boolean }) { return <span className={`admin-badge ${ativo ? 'is-active' : ''}`}>{ativo ? 'Ativo' : 'Inativo'}</span> }
export function Filters({ search, status, onSearch, onStatus }: { search: string; status: string; onSearch: (v: string) => void; onStatus: (v: string) => void }) {
  return <div className="admin-filters"><label>Buscar<input type="search" value={search} onChange={e => onSearch(e.target.value)} placeholder="Nome ou código" /></label>
    <label>Situação<select value={status} onChange={e => onStatus(e.target.value)}><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option></select></label></div>
}
