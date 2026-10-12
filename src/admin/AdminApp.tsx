import { useEffect, useState } from 'react'
import { initializeAdminAuth, loginAdmin, logoutAdmin } from './auth'
import { AdminLink, Notice } from './ui'
import { AcademicPage } from './AcademicPage'
import { CampaignsPage, CampaignDetail } from './CampaignsPage'
import { FormsPage, VersionPage } from './FormsPage'
import './admin.css'

export function AdminApp({ pathname }: { pathname: string }) {
  const [session, setSession] = useState<{ status: string; name?: string; error?: string }>({ status: 'loading' })
  useEffect(() => {
    let active = true
    initializeAdminAuth().then(client => {
      if (active) setSession(client.authenticated && client.hasRealmRole('cpa-admin')
        ? { status: 'ready', name: client.tokenParsed?.preferred_username || 'Administrador' }
        : { status: 'denied' })
    }).catch((e: unknown) => { if (active) setSession({ status: 'error', error: e instanceof Error ? e.message : 'Falha ao autenticar. Tente novamente.' }) })
    const expired = () => setSession({ status: 'expired' })
    const denied = () => setSession({ status: 'denied' })
    window.addEventListener('admin-session-expired', expired)
    window.addEventListener('admin-access-denied', denied)
    return () => { active = false; window.removeEventListener('admin-session-expired', expired); window.removeEventListener('admin-access-denied', denied) }
  }, [])
  let content
  if (session.status !== 'ready') {
    content = <section className="admin-card admin-auth"><h1>{session.status === 'denied' ? 'Acesso negado' : session.status === 'expired' ? 'Sessão expirada' : 'Acesso administrativo'}</h1>
      {session.status === 'loading' ? <p role="status">Conectando ao Keycloak…</p> : <>
        <Notice>{session.status === 'denied' ? 'É necessário o perfil cpa-admin para acessar o painel.' : session.status === 'expired' ? 'Entre novamente para continuar.' : session.error}</Notice>
        {session.status === 'expired' && <button onClick={() => void loginAdmin()}>Entrar novamente</button>}
        {session.status === 'denied' && <button onClick={() => void logoutAdmin()}>Sair desta conta</button>}
        {session.status === 'error' && <button onClick={() => window.location.reload()}>Tentar novamente</button>}
      </>}<a href="/">Voltar à pesquisa</a></section>
  } else {
    let parts: string[] = []
    try { parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean).map(decodeURIComponent) } catch { /* Show not found for malformed URLs. */ }
    const campaign = parts[2]
    const form = parts[4]
    if (parts.length === 1) content = <section className="admin-card"><p className="admin-eyebrow">COMISSÃO PRÓPRIA DE AVALIAÇÃO</p><h1>Painel administrativo</h1><p>Organize os cadastros e prepare as campanhas de avaliação institucional.</p><div className="admin-dashboard">
      <AdminLink href="/admin/campanhas"><h2>Campanhas e formulários</h2><p>Questionários, versões e disponibilidade da pesquisa.</p></AdminLink>
      <AdminLink href="/admin/cursos"><h2>Cursos</h2><p>Cadastros acadêmicos utilizados na avaliação.</p></AdminLink>
      <AdminLink href="/admin/disciplinas"><h2>Disciplinas</h2><p>Disciplinas, professores e vínculos com os cursos.</p></AdminLink>
    </div></section>
    else if (parts[1] === 'cursos' && parts.length === 2) content = <AcademicPage key="courses" kind="cursos" />
    else if (parts[1] === 'disciplinas' && parts.length === 2) content = <AcademicPage key="subjects" kind="disciplinas" />
    else if (parts[1] === 'campanhas' && parts.length === 2) content = <CampaignsPage />
    else if (parts[1] === 'campanhas' && parts.length === 3) content = <CampaignDetail key={campaign} campaign={campaign} />
    else if (parts[1] === 'campanhas' && parts[3] === 'formularios' && (parts.length === 4 || parts.length === 5)) content = <FormsPage key={`${campaign}/${form || ''}`} campaign={campaign} form={form} />
    else if (parts[1] === 'campanhas' && parts[3] === 'formularios' && parts[5] === 'versoes' && parts.length === 7 && /^\d+$/.test(parts[6])) content = <VersionPage key={pathname} campaign={campaign} form={form} number={Number(parts[6])} />
    else content = <section className="admin-card"><h1>Página não encontrada</h1><AdminLink href="/admin">Voltar ao painel</AdminLink></section>
  }
  return <div className="admin-shell"><header className="admin-header"><AdminLink href="/admin"><img src="/logo_femass.svg" alt="FeMASS" /><strong>CPA <span>Administração</span></strong></AdminLink>
    {session.status === 'ready' && <div><span>{session.name}</span><button className="secondary" onClick={() => void logoutAdmin()}>Sair</button></div>}</header>
    {session.status === 'ready' && <nav className="admin-nav" aria-label="Administração"><AdminLink href="/admin">Início</AdminLink><AdminLink href="/admin/campanhas">Campanhas</AdminLink><AdminLink href="/admin/cursos">Cursos</AdminLink><AdminLink href="/admin/disciplinas">Disciplinas</AdminLink><a href="/">Pesquisa pública ↗</a></nav>}
    <main className="admin-main">{content}</main><footer className="admin-footer">CPA · FeMASS · Administração institucional</footer></div>
}
