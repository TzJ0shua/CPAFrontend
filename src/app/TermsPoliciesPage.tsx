import { AppFooter } from '../components/layout/AppFooter'
import { AppHeader } from '../components/layout/AppHeader'

const privacySections = [
  {
    title: 'Política de Privacidade',
    paragraphs: [
      'Para alunos, solicitamos CPF e matrícula para impedir envios repetidos da mesma versão de um formulário. O servidor armazena apenas hashes desses identificadores, calculados com um segredo por campanha. O comprovante e o aplicativo validador mostram a campanha, o formulário e as disciplinas avaliadas, sem CPF, matrícula ou conteúdo das respostas.',
      'A sua privacidade é importante para nós. É política do CPA-FEMASS respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site CPA-FEMASS, e outros sites que possuímos e operamos.',
      'Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.',
      'Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.',
      'Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.',
      'O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.',
      'Você é livre para recusar a nossa solicitação de informações pessoais, entendendo que talvez não possamos fornecer alguns dos serviços desejados.',
      'O uso continuado de nosso site será considerado como aceitação de nossas práticas em torno de privacidade e informações pessoais. Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contacto connosco.',
      'O serviço Google AdSense que usamos para veicular publicidade usa um cookie DoubleClick para veicular anúncios mais relevantes em toda a Web e limitar o número de vezes que um determinado anúncio é exibido para você.',
      'Para mais informações sobre o Google AdSense, consulte as FAQs oficiais sobre privacidade do Google AdSense.',
      'Utilizamos anúncios para compensar os custos de funcionamento deste site e fornecer financiamento para futuros desenvolvimentos. Os cookies de publicidade comportamental usados por este site foram projetados para garantir que você forneça os anúncios mais relevantes sempre que possível, rastreando anonimamente seus interesses e apresentando coisas semelhantes que possam ser do seu interesse.',
      'Vários parceiros anunciam em nosso nome e os cookies de rastreamento de afiliados simplesmente nos permitem ver se nossos clientes acessaram o site através de um dos sites de nossos parceiros, para que possamos creditá-los adequadamente e, quando aplicável, permitir que nossos parceiros afiliados ofereçam qualquer promoção que pode fornecê-lo para fazer uma compra.',
    ],
  },
  {
    title: 'Compromisso do Usuário',
    paragraphs: [
      'O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o CPA-FEMASS oferece no site e com caráter enunciativo, mas não limitativo:',
      'A) Não se envolver em atividades que sejam ilegais ou contrárias à boa fé e à ordem pública;',
      'B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, jogos de sorte ou azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos;',
      'C) Não causar danos aos sistemas físicos (hardwares) e lógicos (softwares) do CPA-FEMASS, de seus fornecedores ou terceiros, para introduzir ou disseminar vírus informáticos ou quaisquer outros sistemas de hardware ou software que sejam capazes de causar danos anteriormente mencionados.',
    ],
  },
  {
    title: 'Mais informações',
    paragraphs: [
      'Esperemos que esteja esclarecido e, como mencionado anteriormente, se houver algo que você não tem certeza se precisa ou não, geralmente é mais seguro deixar os cookies ativados, caso interaja com um dos recursos que você usa em nosso site.',
      'Esta política é efetiva a partir de 19 May 2026 02:21.',
    ],
  },
]

const termsSections = [
  {
    title: '1. Termos',
    paragraphs: [
      'Ao acessar ao site CPA-FEMASS, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você não concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.',
    ],
  },
  {
    title: '2. Uso de Licença',
    paragraphs: [
      'É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site CPA-FEMASS, apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título.',
      'Sob esta licença, você não pode: modificar ou copiar os materiais; usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial); tentar descompilar ou fazer engenharia reversa de qualquer software contido no site CPA-FEMASS; remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; transferir os materiais para outra pessoa ou espelhar os materiais em qualquer outro servidor.',
      'Esta licença será automaticamente rescindida se você violar alguma dessas restrições e poderá ser rescindida por CPA-FEMASS a qualquer momento. Ao encerrar a visualização desses materiais ou após o término desta licença, você deve apagar todos os materiais baixados em sua posse, seja em formato eletrónico ou impresso.',
    ],
  },
  {
    title: '3. Isenção de responsabilidade',
    paragraphs: [
      "Os materiais no site da CPA-FEMASS são fornecidos 'como estão'. CPA-FEMASS não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.",
      'Além disso, o CPA-FEMASS não garante ou faz qualquer representação relativa à precisão, aos resultados prováveis ou à confiabilidade do uso dos materiais em seu site ou de outra forma relacionado a esses materiais ou em sites vinculados a este site.',
    ],
  },
  {
    title: '4. Limitações',
    paragraphs: [
      'Em nenhum caso o CPA-FEMASS ou seus fornecedores serão responsáveis por quaisquer danos, incluindo, sem limitação, danos por perda de dados ou lucro ou devido à interrupção dos negócios, decorrentes do uso ou da incapacidade de usar os materiais em CPA-FEMASS, mesmo que CPA-FEMASS ou um representante autorizado da CPA-FEMASS tenha sido notificado oralmente ou por escrito da possibilidade de tais danos.',
      'Como algumas jurisdições não permitem limitações em garantias implícitas, ou limitações de responsabilidade por danos consequentes ou incidentais, essas limitações podem não se aplicar a você.',
    ],
  },
  {
    title: '5. Precisão dos materiais',
    paragraphs: [
      'Os materiais exibidos no site da CPA-FEMASS podem incluir erros técnicos, tipográficos ou fotográficos. CPA-FEMASS não garante que qualquer material em seu site seja preciso, completo ou atual. CPA-FEMASS pode fazer alterações nos materiais contidos em seu site a qualquer momento, sem aviso prévio. No entanto, CPA-FEMASS não se compromete a atualizar os materiais.',
    ],
  },
  {
    title: '6. Links',
    paragraphs: [
      'O CPA-FEMASS não analisou todos os sites vinculados ao seu site e não é responsável pelo conteúdo de nenhum site vinculado. A inclusão de qualquer link não implica endosso por CPA-FEMASS do site. O uso de qualquer site vinculado é por conta e risco do usuário.',
    ],
  },
  {
    title: 'Modificações',
    paragraphs: [
      'O CPA-FEMASS pode revisar estes termos de serviço do site a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.',
    ],
  },
  {
    title: 'Lei aplicável',
    paragraphs: [
      'Estes termos e condições são regidos e interpretados de acordo com as leis do CPA-FEMASS e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais naquele estado ou localidade.',
    ],
  },
]

function LegalSection({
  paragraphs,
  title,
}: {
  paragraphs: string[]
  title: string
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      {paragraphs.map((paragraph) => (
        <p className="text-sm leading-7 text-slate-600 sm:text-base" key={paragraph}>
          {paragraph}
        </p>
      ))}
    </section>
  )
}

export function TermsPoliciesPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_34rem),linear-gradient(180deg,_#f8fbff,_#eef3f8)] text-slate-900">
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1 px-4 py-8">
          <article className="survey-enter mx-auto grid max-w-3xl gap-8 rounded-lg border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-900/10 sm:p-8">
            <div className="border-b border-slate-200 pb-6 text-center">
              <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                CPA-FEMASS
              </span>
              <h1 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">
                Termos de Uso e Política de Privacidade
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Leia com atenção as condições de uso, privacidade e tratamento das informações antes de responder à pesquisa.
              </p>
            </div>

            <div className="grid gap-7">
              {privacySections.map((section) => (
                <LegalSection key={section.title} {...section} />
              ))}
            </div>

            <div className="h-px bg-slate-200" />

            <div className="grid gap-7">
              {termsSections.map((section) => (
                <LegalSection key={section.title} {...section} />
              ))}
            </div>

            <div className="border-t border-slate-200 pt-6">
              <a
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-blue-700 px-5 text-center font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:bg-blue-800 sm:w-auto"
                href="/"
              >
                Voltar para a pesquisa
              </a>
            </div>
          </article>
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
