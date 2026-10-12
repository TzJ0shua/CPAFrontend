# CPA FeMASS - Controle de Respostas

Frontend em React, Vite e Tailwind CSS para coleta de avaliações institucionais da FeMASS.

## Configuração

Crie um arquivo `.env` na raiz do projeto. Ele é ignorado pelo Git e não deve receber credenciais ou tokens — as configurações `VITE_` são públicas e acessíveis pelo navegador.

Use [`.env.example`](.env.example) como modelo. Ele está alinhado ao exemplo do CPABackend com API em `http://localhost:8081` e frontend Docker na porta `5175`, e inclui alternativas comentadas para os domínios de teste. O bloco abaixo usa as portas locais padrão como alternativa. Após alterar as variáveis `VITE_`, reinicie o Vite ou recrie o contêiner Docker.

```env
# URL pública da API. Sem barra no fim.
VITE_API_BASE_URL=http://localhost:8080

# Login administrativo: URL pública do Keycloak, sem /realms/cpa.
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=cpa
VITE_KEYCLOAK_CLIENT_ID=cpa-frontend

# Mensagem padrão quando a campanha estiver indisponível.
VITE_CPA_CAMPAIGN_UNAVAILABLE_MESSAGE=A pesquisa está indisponível no momento. Tente novamente mais tarde.

# Porta HTTP do container Nginx ao executar Docker Compose.
FRONTEND_PORT=5173

# Opcional, somente para testes de navegador.
PLAYWRIGHT_CHANNEL=msedge
```

Para desenvolvimento local, execute `npm run dev`. Para servir a imagem de produção, execute:

```bash
docker compose up -d --build
```

### Referência das variáveis

| Variável | Uso | Padrão / observação |
| --- | --- | --- |
| `VITE_API_BASE_URL` | URL pública da API, acessível pelo navegador, sem barra final. | Compose: `http://localhost:8080`. Sem configuração no Vite: localhost em desenvolvimento e mesma origem em produção. |
| `VITE_KEYCLOAK_URL` | URL pública do Keycloak, sem o caminho do realm. | Compose: `http://localhost:8180`; obrigatória para entrar no painel. |
| `VITE_KEYCLOAK_REALM` | Realm usado pelo login administrativo. | Docker: `cpa`; obrigatória no Vite. |
| `VITE_KEYCLOAK_CLIENT_ID` | Identificador do cliente público OIDC do frontend. | `cpa-frontend`. |
| `VITE_CPA_CAMPAIGN_UNAVAILABLE_MESSAGE` | Mensagem de indisponibilidade quando a API não fornecer uma mensagem. | `A pesquisa está indisponível no momento. Tente novamente mais tarde.` |
| `FRONTEND_PORT` | Porta publicada pelo Compose para o Nginx, que escuta na porta interna `80`. | `5173`; não altera a porta do servidor `npm run dev`. |
| `PLAYWRIGHT_CHANNEL` | Navegador usado por `npm run test:e2e`. | `msedge`; pode ser `chrome` se instalado. É lida pelo processo de testes, não pelo bundle. |

No Vite local, as variáveis `VITE_` são resolvidas ao iniciar o servidor ou construir o bundle. Na imagem Docker, o script de inicialização gera `/runtime-config.js` com as cinco configurações públicas da tabela, antes de iniciar o Nginx. Elas têm prioridade sobre os valores do build e esse arquivo é servido com `Cache-Control: no-store`. Alterações exigem recriar o contêiner e recarregar a página; não é necessário reconstruir a imagem. `import.meta.env.DEV` é uma informação automática do Vite, não uma variável para preencher no `.env`.

O Compose encaminha as cinco configurações públicas como variáveis de ambiente do contêiner. Arquivos `.env*` ficam fora do contexto Docker. O Dockerfile ainda aceita os argumentos de build da API e do Keycloak para builds personalizados; a imagem publicada não incorpora URLs de um ambiente específico. Para testes, exporte `PLAYWRIGHT_CHANNEL` no terminal antes do comando; o Playwright não carrega automaticamente o `.env` do Vite.

### Imagem publicada e configuração na VPS

Use tags numéricas explícitas. A versão desta entrega é `contatocpa/cpa-frontend-test:1.0.0`, para Linux AMD64. No Compose da VPS, utilize:

```yaml
services:
  frontend:
    image: contatocpa/cpa-frontend-test:1.0.0
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-5175}:80"
    environment:
      VITE_API_BASE_URL: ${VITE_API_BASE_URL:?Configure a URL pública da API}
      VITE_KEYCLOAK_URL: ${VITE_KEYCLOAK_URL:?Configure a URL pública do Keycloak}
      VITE_KEYCLOAK_REALM: ${VITE_KEYCLOAK_REALM:-cpa}
      VITE_KEYCLOAK_CLIENT_ID: ${VITE_KEYCLOAK_CLIENT_ID:-cpa-frontend}
      VITE_CPA_CAMPAIGN_UNAVAILABLE_MESSAGE: ${VITE_CPA_CAMPAIGN_UNAVAILABLE_MESSAGE:-}
```

Preencha o `.env` na mesma pasta desse Compose com as URLs públicas da VPS. A URL do Keycloak não deve incluir `/realms/cpa`. Alinhe também as origens CORS do backend e os redirecionamentos do cliente Keycloak com o domínio do frontend. O `.env` sozinho não injeta valores em uma imagem: mantenha o bloco `environment` acima.

```bash
docker compose pull frontend
docker compose up -d --no-build --force-recreate frontend
```

Para novas releases, publique outra tag, como `1.0.1`, e atualize o Compose. A publicação desta entrega não altera a tag `latest` existente.

### Variáveis da configuração anterior

`VITE_CPA_CAMPAIGN` aparece em configurações antigas, mas não é mais consumida. A pesquisa consulta `/campanhas/atual/disponibilidade` e utiliza a campanha ativa, aberta e dentro do período. Essa variável pode ser removida do `.env`.

As variáveis de banco, CORS, Gmail e administração do servidor Keycloak pertencem ao backend; estão documentadas no README do **CPABackend**. Mantenha `KEYCLOAK_FRONTEND_URL` e as origens CORS alinhadas com a URL pública deste frontend, inclusive quando alterar `FRONTEND_PORT`. As credenciais do Gmail e do banco nunca devem receber o prefixo `VITE_`.

## Identificação dos alunos

Para alunos, CPF válido e matrícula com 10 dígitos são obrigatórios; zeros à esquerda são preservados. Esses dados permanecem em memória no navegador e são enviados no corpo do POST, sem aparecer em URLs ou no QR Code. O backend armazena somente hashes com `VALIDACAO_ALUNO_HASH_SEED`, configurada exclusivamente no backend.

Cada aluno pode responder uma vez por versão de formulário de cada campanha. Reutilizar o CPF **ou** a matrícula nessa versão retorna `409` com `code: FORMULARIO_JA_RESPONDIDO`; a seleção permite escolher outro formulário ou outra versão. Para avaliações por disciplina, selecione todas as disciplinas desejadas antes do envio: não é possível acrescentar disciplinas depois na mesma versão.

## Acesso dos participantes por email ou chave mestra

Para docentes e funcionários, a sequência é **perfil → verificação por email/PIN ou chave mestra → escolha do formulário → preenchimento**. A escolha é exibida mesmo quando há apenas um formulário disponível, sem selecionar automaticamente uma avaliação. O botão **Voltar** do questionário geral ou da escolha de curso retorna à seleção com todos os formulários disponíveis, preservando a autorização de acesso. Cursos são carregados somente após a escolha de um formulário por disciplina.

Ao entrar como docente ou funcionário, a pesquisa consulta `GET /verificacao-email/configuracao`. Com serviço de email configurado, é possível usar o PIN enviado ao email institucional ou a chave mestra. Sem configuração, o campo de email fica somente para leitura, com o aviso **Serviço de email indisponível** e orientação para inserir a chave mestra. Uma falha no envio também permite recorrer à chave.

A chave é definida como `VERIFICACAO_EMAIL_CHAVE_MESTRA` no `.env` do **backend**, e encaminhada pelo Compose. Não adicione a chave ao `.env` deste frontend nem use `VITE_`: ela é secreta. Veja as instruções no README do CPABackend. Vazia por padrão, desabilita esse método; após configurar, recrie o backend.

O frontend envia a chave somente para `POST /verificacao-email/chave-mestra` e mantém em memória a autorização temporária retornada. A chave não aparece em URLs, armazenamento do navegador nem no payload das respostas. O backend verifica público, formulário publicado e disponibilidade da campanha; usar a chave não libera acesso administrativo.

## Painel administrativo

Docentes e funcionários autenticados por PIN podem responder cada versão de formulário uma única vez por email confirmado na campanha. Um novo PIN não libera outra resposta da mesma versão; outra versão ou outro formulário continuam permitidos. A identidade é obtida pelo backend a partir da autorização opaca, e o email não é incluído no POST das respostas. O conflito `FORMULARIO_JA_RESPONDIDO` retorna à seleção para permitir outra escolha, preservando a autorização durante sua validade. O acesso por chave mestra continua como exceção ao limite por email.

O campo **Comentários adicionais** depende da opção **Permitir comentário** de cada versão, que começa desmarcada nos novos rascunhos e está desabilitada em vários formulários iniciais. Abra a versão, marque essa opção e preencha o aviso. Em rascunhos, salve e publique; em versões publicadas, use **Salvar alterações** para aplicar a configuração imediatamente. O editor informa se o campo aparecerá na pesquisa; quando habilitado, o comentário é opcional e limitado a 1000 caracteres, tanto na avaliação geral quanto por disciplina.

Acesse `/admin`. O login usa o Keycloak e exige o papel de realm `cpa-admin`.
A pesquisa pública não inicializa a autenticação. Os tokens ficam apenas em memória;
as requisições administrativas renovam o token e enviam `Authorization: Bearer`.

Configure antes de iniciar o Vite ou criar o contêiner:

```env
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=cpa
VITE_KEYCLOAK_CLIENT_ID=cpa-frontend
```

`VITE_KEYCLOAK_URL` é a URL pública acessível pelo navegador, sem `/realms/cpa`.
Não use o hostname interno do Docker. As variáveis `VITE_` são públicas e não devem
conter segredos. Recrie o contêiner após alterar a configuração; no Vite local, reinicie o servidor.

No Keycloak, configure um cliente público OpenID Connect `cpa-frontend`, com
Standard Flow habilitado, PKCE S256 obrigatório e Direct Access Grants desabilitado.
Cadastre a origem exata do frontend, redirecionamentos `/admin` e `/admin/*`, e
retorno de logout `/`. Adicione um mapper de audiência `cpa-backend` ao access token
e atribua `cpa-admin` aos usuários da comissão. Veja também as instruções de realm
existente no README do backend.

O painel oferece campanhas, cursos, disciplinas e formulários versionados.
Na listagem e nos detalhes da campanha, **Excluir campanha** permite apagar campanhas com ou sem respostas. O painel consulta os dados atuais e abre a confirmação nativa do navegador: informa quantas respostas estão vinculadas ou que não há respostas atreladas, e avisa que a campanha, formulários, versões, perguntas, opções, avaliações, respostas, comprovantes/QR Codes e autorizações de acesso serão apagados definitivamente. Cancelar não exclui nada. Os comprovantes da campanha excluída deixam de funcionar; cursos, disciplinas e outras campanhas são preservados. Use **Desativar** para preservar o histórico.

Se novas respostas ou outros registros chegarem entre a consulta e a confirmação, o backend retorna `409` e o painel pede para consultar e confirmar novamente. Não há repetição automática da exclusão.

Na listagem de formulários de uma campanha em rascunho ou aprovada, use **Clonar de outra campanha**. Escolha a campanha, o formulário e a versão de origem, incluindo campanhas encerradas ou inativas, e informe o código e nome da cópia. Será criado um novo formulário ativo, com versão 1 em rascunho e identificadores próprios; a campanha de destino volta ao estado de rascunho. O conteúdo e as respostas da origem permanecem preservados.

No editor, **Remover pergunta** retira a pergunta do questionário. Perguntas já salvas são desativadas e podem ser recuperadas em **Mostrar perguntas desativadas**; perguntas novas ainda não salvas são descartadas. Salve para efetivar as alterações. Um rascunho pode ficar sem perguntas; a publicação e a edição de uma versão publicada exigem pelo menos uma pergunta ativa e opções ativas em cada pergunta ativa.

Versões publicadas podem ser editadas diretamente, inclusive em campanhas aprovadas, abertas ou encerradas. **Salvar alterações** atualiza nome, público, escopo, ordem, comentários, perguntas e opções na mesma versão, sem exigir clonagem, nova aprovação ou alterar o estado da campanha. O painel solicita confirmação porque respostas anteriores continuam vinculadas a essa versão e passam a referenciar as perguntas e metadados modificados. Identificadores, respostas, notas, rótulos de opções já registrados e vínculos de validação são preservados. A edição não libera uma nova participação de quem já respondeu à versão; outra versão continua permitida.

As demais regras de aprovação permanecem: criar um formulário, clonar a versão mais recente, salvar um rascunho ou publicar uma nova versão faz a campanha voltar a rascunho. Clonar de outra campanha exige destino em rascunho ou aprovado e também retorna o destino a rascunho. Abrir exige campanha ativa e aprovada; aprovar exige rascunho ativo com pelo menos uma versão publicada ativa.

Desativar mantém o registro; um pai inativo oculta seus filhos da pesquisa sem
alterar a ativação individual deles. A clonagem da versão mais recente continua
disponível para criar um novo rascunho. Salve o rascunho antes de publicar;
alterações em rascunhos retornam a campanha ao estado de rascunho.

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
