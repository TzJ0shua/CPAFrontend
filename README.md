# CPA FeMASS - Controle de Respostas

Frontend em React, Vite e Tailwind CSS para coleta de avaliações institucionais da FeMASS.

## Configuração

Crie um arquivo `.env` na raiz do projeto. Ele é ignorado pelo Git e não deve receber credenciais ou tokens — tudo que começa com `VITE_` é incorporado ao bundle público do navegador.

```env
# URL pública da API. Sem barra no fim.
VITE_API_BASE_URL=http://localhost:8080

# Código da campanha consultada no catálogo e no endpoint público
# /campanhas/{codigo}/disponibilidade.

# Mensagem padrão quando a campanha estiver indisponível.
VITE_CPA_CAMPAIGN_UNAVAILABLE_MESSAGE=A pesquisa está indisponível no momento. Tente novamente mais tarde.

# Porta HTTP do container Nginx ao executar Docker Compose.
FRONTEND_PORT=5173
```

Para desenvolvimento local, execute `npm run dev`. Para servir a imagem de produção, execute:

```bash
docker compose up -d --build
```

O `VITE_API_BASE_URL` é definido durante o build da imagem; reconstrua o container após alterá-lo.

## Painel administrativo

Acesse `/admin`. O login usa o Keycloak e exige o papel de realm `cpa-admin`.
A pesquisa pública não inicializa a autenticação. Os tokens ficam apenas em memória;
as requisições administrativas renovam o token e enviam `Authorization: Bearer`.

Configure antes de iniciar o Vite ou construir a imagem:

```env
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=cpa
VITE_KEYCLOAK_CLIENT_ID=cpa-frontend
```

`VITE_KEYCLOAK_URL` é a URL pública acessível pelo navegador, sem `/realms/cpa`.
Não use o hostname interno do Docker. As variáveis `VITE_` são públicas e não devem
conter segredos. Reconstrua a imagem após alterar a configuração.

No Keycloak, configure um cliente público OpenID Connect `cpa-frontend`, com
Standard Flow habilitado, PKCE S256 obrigatório e Direct Access Grants desabilitado.
Cadastre a origem exata do frontend, redirecionamentos `/admin` e `/admin/*`, e
retorno de logout `/`. Adicione um mapper de audiência `cpa-backend` ao access token
e atribua `cpa-admin` aos usuários da comissão. Veja também as instruções de realm
existente no README do backend.

O painel oferece campanhas, cursos, disciplinas e formulários versionados.
Desativar mantém o registro; um pai inativo oculta seus filhos da pesquisa sem
alterar a ativação individual deles. Versões publicadas são somente para leitura:
clone a versão mais recente para editar um novo rascunho. Salve o rascunho antes
de publicar; alterações de conteúdo retornam a campanha ao estado de rascunho.

Para validar:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Os testes de navegador usam um provedor OIDC e uma API simulados, sem acessar os
cadastros reais. Executam no Microsoft Edge instalado e verificam desktop e celular.
Para usar outro navegador instalado, defina `PLAYWRIGHT_CHANNEL` (por exemplo, `chrome`).

## Comprovante com QR Code

Após enviar a avaliação, a tela do comprovante exibe o QR Code e o identificador
`codigoDigestFinal` retornado por `POST /formulario`: os 10 últimos caracteres do
digest armazenado pelo backend. Esse identificador corresponde ao exibido pelo
CPAValidador e pelo histórico. O conteúdo do QR Code continua sendo o código opaco
original, utilizado para validar a participação. Se a API não retornar o identificador,
o comprovante continua exibindo o QR Code.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Estrutura principal

- `src/app`: páginas da aplicação.
- `src/components/layout`: cabeçalho e rodapé.
- `src/components/survey`: fluxo de avaliação, etapas e componentes de UI.
- `src/lib`: tipos e dados base da pesquisa.
- `src/services`: ponto preparado para futura integração REST.

### Período das campanhas

Configure início e fim no painel administrativo. Os dias são inclusivos no fuso `America/Sao_Paulo`; a campanha também deve estar ativa e aberta. Após a migração V14, configure as datas das campanhas existentes: elas ficam indisponíveis até receberem um período. A pesquisa seleciona automaticamente a campanha disponível pela API, sem código fixo no build. Não é permitido abrir campanhas ativas com períodos sobrepostos. A pesquisa revalida a disponibilidade a cada 60 segundos, ao retornar à aba e antes de enviar; o backend valida novamente cada envio.
