import { Link } from 'react-router-dom';
import {
  Download,
  Database,
  Bell,
  Check,
  X,
  Minus,
  ArrowRight,
  Lock,
} from 'lucide-react';

export function LandingPage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-primary focus:text-text-inverse focus:px-4 focus:py-2 focus:rounded-lg focus:z-[1000] focus:font-semibold"
      >
        Pular para o conteúdo
      </a>

      {/* ==========================================
          HEADER
          ========================================== */}
      <header
        role="banner"
        className="sticky top-0 z-[100] h-[72px] bg-white/85 backdrop-blur-md border-b border-border"
      >
        <div className="flex items-center justify-between h-full max-w-[1200px] mx-auto px-6">
          <Link
            to="/"
            className="flex items-center gap-2 font-extrabold text-xl text-text-primary"
            aria-label="Beacon — Página inicial"
          >
            <div
              className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm"
              aria-hidden="true"
            >
              B
            </div>
            <span>Beacon</span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-6"
            aria-label="Navegação principal"
          >
            <a
              href="#como-funciona"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors motion-reduce:transition-none"
            >
              Como funciona
            </a>
            <a
              href="#antes-depois"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors motion-reduce:transition-none"
            >
              Antes vs. Depois
            </a>
            <a
              href="#comparacao"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors motion-reduce:transition-none"
            >
              Comparação
            </a>
            <a
              href="#para-quem"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors motion-reduce:transition-none"
            >
              Para quem
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 text-sm bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 motion-reduce:transition-none"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 text-sm bg-primary text-text-inverse hover:bg-primary-hover focus:ring-primary motion-reduce:transition-none"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* ==========================================
            HERO
            ========================================== */}
        <section
          className="pt-16 pb-20 sm:pt-16 sm:pb-20 text-center"
          aria-labelledby="hero-heading"
        >
          <div className="max-w-[800px] mx-auto px-6">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-dark text-sm font-semibold px-4 py-1 rounded-full mb-6">
              <span
                className="w-2 h-2 bg-primary rounded-full"
                aria-hidden="true"
              />
              Monitoramento contínuo de dados — agente local
            </div>

            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-text-primary mb-6"
            >
              Seus dados estão{' '}
              <span className="bg-gradient-to-r from-primary to-critical bg-clip-text text-transparent">
                saudáveis?
              </span>
              <br />
              Descubra antes que alguém perceba.
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-text-secondary leading-relaxed max-w-[600px] mx-auto mb-8">
              O Beacon monitora seus dados 24/7 e alerta sobre anomalias
              silenciosas antes que aquele relatório errado chegue na reunião do
              CFO.
            </p>

            <div
              className="inline-flex items-center gap-3 bg-success-light text-success-dark text-sm font-semibold px-6 py-2 rounded-full mb-8"
              role="note"
            >
              <Lock size={18} aria-hidden="true" />
              Sem que seus dados saiam do seu servidor.
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
              <Link
                to="/register"
                className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-6 py-3 text-base bg-primary text-text-inverse hover:bg-primary-hover focus:ring-primary motion-reduce:transition-none sm:w-auto w-full"
              >
                Criar conta grátis
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-6 py-3 text-base border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-500 motion-reduce:transition-none sm:w-auto w-full"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </section>

        {/* ==========================================
            HOW IT WORKS
            ========================================== */}
        <section
          className="py-12 sm:py-16 lg:py-20 bg-surface scroll-mt-20"
          id="como-funciona"
          aria-labelledby="how-heading"
        >
          <div className="text-center max-w-[700px] mx-auto mb-12 px-6">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Como funciona
            </p>
            <h2
              id="how-heading"
              className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-text-primary mb-4"
            >
              Três passos para nunca mais ser pego de surpresa
            </h2>
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
              Instale o agente, conecte seu banco e receba alertas
              inteligentes. Simples assim.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1200px] mx-auto px-6 lg:max-w-none">
            <article
              className="text-center p-8 bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-shadow transition-transform motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <div
                className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 text-primary rounded-full text-xl font-bold mb-4"
                aria-hidden="true"
              >
                1
              </div>
              <div
                className="w-16 h-16 mx-auto mb-4 bg-primary-50 rounded-xl flex items-center justify-center text-primary"
                aria-hidden="true"
              >
                <Download size={32} />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Instale o agente
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Um comando no terminal. O agente roda onde seus dados estão
                — no seu servidor, na sua VPC, sob seu controle.
              </p>
            </article>

            <article
              className="text-center p-8 bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-shadow transition-transform motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <div
                className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 text-primary rounded-full text-xl font-bold mb-4"
                aria-hidden="true"
              >
                2
              </div>
              <div
                className="w-16 h-16 mx-auto mb-4 bg-primary-50 rounded-xl flex items-center justify-center text-primary"
                aria-hidden="true"
              >
                <Database size={32} />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Conecte seu banco
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                PostgreSQL, MySQL, BigQuery e mais. O agente aprende o perfil
                estatístico de cada tabela automaticamente.
              </p>
            </article>

            <article
              className="text-center p-8 bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-shadow transition-transform motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <div
                className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 text-primary rounded-full text-xl font-bold mb-4"
                aria-hidden="true"
              >
                3
              </div>
              <div
                className="w-16 h-16 mx-auto mb-4 bg-primary-50 rounded-xl flex items-center justify-center text-primary"
                aria-hidden="true"
              >
                <Bell size={32} />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Receba alertas
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Quando algo sai do padrão — volume inesperado, nulos demais,
                schema alterado — você recebe um alerta por email ou Slack.
              </p>
            </article>
          </div>
        </section>

        {/* ==========================================
            BEFORE / AFTER
            ========================================== */}
        <section
          className="py-12 sm:py-16 lg:py-20 scroll-mt-20"
          id="antes-depois"
          aria-labelledby="ba-heading"
        >
          <div className="text-center max-w-[700px] mx-auto mb-12 px-6">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Antes vs. Depois
            </p>
            <h2
              id="ba-heading"
              className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-text-primary mb-4"
            >
              O que muda com o Beacon no seu dia a dia
            </h2>
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
              Da ansiedade de descobrir problemas na pior hora para a
              tranquilidade de ser avisado antes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 max-w-[1200px] mx-auto px-6 items-start justify-items-center lg:max-w-none">
            <article className="p-8 rounded-2xl bg-danger-light border border-red-200 w-full max-w-[500px]">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4 bg-red-200 text-danger-dark">
                <X size={14} aria-hidden="true" />
                Antes do Beacon
              </span>
              <p className="text-sm font-semibold text-text-secondary mb-3">
                Cenário: O pipeline de vendas quebrou no sábado à noite.
              </p>
              <h3 className="text-xl font-bold text-text-primary mb-4 leading-tight">
                Você só descobre na segunda-feira, quando o CFO pergunta.
              </h3>
              <ul
                className="flex flex-col gap-3"
                aria-label="Dores do cenário antes do Beacon"
              >
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <X
                    size={16}
                    className="flex-shrink-0 mt-0.5 text-danger"
                    aria-hidden="true"
                  />
                  <span>
                    Descobre dados quebrados 48h depois, quando alguém reclama
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <X
                    size={16}
                    className="flex-shrink-0 mt-0.5 text-danger"
                    aria-hidden="true"
                  />
                  <span>
                    Gasta horas investigando logs para achar a causa raiz
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <X
                    size={16}
                    className="flex-shrink-0 mt-0.5 text-danger"
                    aria-hidden="true"
                  />
                  <span>
                    Fica ansioso antes de toda reunião importante de negócios
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <X
                    size={16}
                    className="flex-shrink-0 mt-0.5 text-danger"
                    aria-hidden="true"
                  />
                  <span>
                    Monitoramento manual: queries SQL que ninguém lembra de
                    rodar
                  </span>
                </li>
              </ul>
            </article>

            <div
              className="flex items-center justify-center text-3xl text-primary font-bold py-4 px-6 self-center lg:py-12 lg:rotate-0 rotate-90"
              aria-hidden="true"
            >
              <ArrowRight size={36} />
            </div>

            <article className="p-8 rounded-2xl bg-success-light border border-green-200 w-full max-w-[500px]">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4 bg-green-200 text-success-dark">
                <Check size={14} aria-hidden="true" />
                Com o Beacon
              </span>
              <p className="text-sm font-semibold text-text-secondary mb-3">
                Cenário: O pipeline de vendas quebrou no sábado à noite.
              </p>
              <h3 className="text-xl font-bold text-text-primary mb-4 leading-tight">
                Você recebe um alerta às 22:07 de sábado e resolve antes de
                virar problema.
              </h3>
              <ul
                className="flex flex-col gap-3"
                aria-label="Benefícios com o Beacon"
              >
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 mt-0.5 text-success"
                    aria-hidden="true"
                  />
                  <span>
                    Alerta por email ou Slack no momento em que a anomalia é
                    detectada
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 mt-0.5 text-success"
                    aria-hidden="true"
                  />
                  <span>
                    Dashboard mostra exatamente qual tabela, qual métrica e o
                    desvio
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 mt-0.5 text-success"
                    aria-hidden="true"
                  />
                  <span>
                    Histórico completo de anomalias com recomendação prática
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 mt-0.5 text-success"
                    aria-hidden="true"
                  />
                  <span>
                    Monitoramento 24/7: seus dados nunca mais ficam sem vigia
                  </span>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* ==========================================
            COMPARISON TABLE
            ========================================== */}
        <section
          className="py-12 sm:py-16 lg:py-20 bg-surface scroll-mt-20"
          id="comparacao"
          aria-labelledby="comp-heading"
        >
          <div className="text-center max-w-[700px] mx-auto mb-12 px-6">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Comparação
            </p>
            <h2
              id="comp-heading"
              className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-text-primary mb-4"
            >
              Por que o Beacon é diferente
            </h2>
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
              Monitoramento de dados não é novidade. Mas ninguém faz como a
              gente.
            </p>
          </div>

          <div className="max-w-[1200px] mx-auto px-6 overflow-x-auto">
            <table
              className="w-full border-separate border-spacing-0 border border-border rounded-xl overflow-hidden shadow-sm text-sm"
              role="table"
            >
              <caption className="sr-only">
                Comparação entre Beacon e outras abordagens de monitoramento de
                dados
              </caption>
              <thead className="bg-bg">
                <tr>
                  <th
                    scope="col"
                    className="text-left px-4 py-4 md:px-6 font-semibold text-text-secondary border-b border-border text-xs uppercase tracking-wider"
                  >
                    Critério
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-4 md:px-6 font-semibold text-primary-dark border-b border-border text-xs uppercase tracking-wider bg-primary-50/50"
                  >
                    Beacon
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-4 md:px-6 font-semibold text-text-secondary border-b border-border text-xs uppercase tracking-wider"
                  >
                    Monitoramento manual
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-4 md:px-6 font-semibold text-text-secondary border-b border-border text-xs uppercase tracking-wider"
                  >
                    Ferramentas de BI
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-4 md:px-6 font-semibold text-text-secondary border-b border-border text-xs uppercase tracking-wider"
                  >
                    Testes de dados tradicionais
                  </th>
                </tr>
              </thead>
              <tbody>
                {([
                  {
                    criterion: 'Detecção automática de anomalias',
                    beacon: 'yes',
                    manual: 'no',
                    bi: 'no',
                    tests: 'partial',
                  },
                  {
                    criterion: 'Monitoramento 24/7',
                    beacon: 'yes',
                    manual: 'no',
                    bi: 'yes',
                    tests: 'no',
                  },
                  {
                    criterion: 'Dados não saem do servidor',
                    beacon: 'yes',
                    manual: 'yes',
                    bi: 'no',
                    tests: 'yes',
                  },
                  {
                    criterion: 'Perfil estatístico automático',
                    beacon: 'yes',
                    manual: 'no',
                    bi: 'no',
                    tests: 'partial',
                  },
                  {
                    criterion: 'Alertas por email e Slack',
                    beacon: 'yes',
                    manual: 'no',
                    bi: 'partial',
                    tests: 'no',
                  },
                  {
                    criterion: 'Recomendação prática de resolução',
                    beacon: 'yes',
                    manual: 'no',
                    bi: 'no',
                    tests: 'no',
                  },
                  {
                    criterion: 'Zero configuração de queries',
                    beacon: 'yes',
                    manual: 'no',
                    bi: 'partial',
                    tests: 'no',
                  },
                ] as const).map(
                  ({ criterion, beacon, manual, bi, tests }) => (
                    <tr key={criterion}>
                      <td className="px-4 py-4 md:px-6 border-b border-border-light text-text-secondary">
                        <strong>{criterion}</strong>
                      </td>
                      <td className="px-4 py-4 md:px-6 border-b border-border-light font-semibold text-primary-dark bg-primary-50/50">
                        <ComparisonIcon value={beacon} />
                      </td>
                      <td className="px-4 py-4 md:px-6 border-b border-border-light text-text-secondary">
                        <ComparisonIcon value={manual} />
                      </td>
                      <td className="px-4 py-4 md:px-6 border-b border-border-light text-text-secondary">
                        <ComparisonIcon value={bi} />
                      </td>
                      <td className="px-4 py-4 md:px-6 border-b border-border-light text-text-secondary">
                        <ComparisonIcon value={tests} />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ==========================================
            PERSONAS
            ========================================== */}
        <section
          className="py-12 sm:py-16 lg:py-20 scroll-mt-20"
          id="para-quem"
          aria-labelledby="personas-heading"
        >
          <div className="text-center max-w-[700px] mx-auto mb-12 px-6">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Quem deveria usar
            </p>
            <h2
              id="personas-heading"
              className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-text-primary mb-4"
            >
              Feito para quem vive de dados — e sabe o peso de um dado errado
            </h2>
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
              Não importa se você escreve pipelines ou aprova o orçamento: o
              Beacon fala a sua língua.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1200px] mx-auto px-6 lg:max-w-none">
            <article className="bg-surface border border-border rounded-2xl p-8 shadow-sm flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-shadow transition-transform motion-reduce:transition-none motion-reduce:hover:transform-none">
              <div>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-4 bg-primary-50 text-primary"
                  aria-hidden="true"
                >
                  DE
                </div>
                <p className="text-sm font-semibold text-primary mb-1">
                  Data Engineer
                </p>
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Pare de caçar bugs de dados de madrugada
                </h3>
                <div className="text-sm text-danger-dark font-medium mb-4 p-3 bg-danger-light rounded-lg border-l-[3px] border-l-danger">
                  &ldquo;A tabela de transações está com metade das linhas
                  desde ontem e ninguém viu.&rdquo;
                </div>
              </div>
              <ul
                className="flex flex-col gap-3 mt-auto"
                aria-label="Benefícios para Data Engineer"
              >
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 w-5 h-5 text-success mt-px"
                    aria-hidden="true"
                  />
                  <span>
                    Detecta desvios de volume, schema e distribuição
                    automaticamente
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 w-5 h-5 text-success mt-px"
                    aria-hidden="true"
                  />
                  <span>
                    Deep link direto do alerta para a anomalia com evidências
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 w-5 h-5 text-success mt-px"
                    aria-hidden="true"
                  />
                  <span>
                    Agente leve: não compete com seu banco por recursos
                  </span>
                </li>
              </ul>
            </article>

            <article className="bg-surface border border-border rounded-2xl p-8 shadow-sm flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-shadow transition-transform motion-reduce:transition-none motion-reduce:hover:transform-none">
              <div>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-4 bg-success-light text-success"
                  aria-hidden="true"
                >
                  DA
                </div>
                <p className="text-sm font-semibold text-primary mb-1">
                  Data Analyst
                </p>
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Confie nos números que você apresenta
                </h3>
                <div className="text-sm text-danger-dark font-medium mb-4 p-3 bg-danger-light rounded-lg border-l-[3px] border-l-danger">
                  &ldquo;Apresentei o dashboard errado na reunião semanal
                  porque ninguém viu o pipeline quebrado.&rdquo;
                </div>
              </div>
              <ul
                className="flex flex-col gap-3 mt-auto"
                aria-label="Benefícios para Data Analyst"
              >
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 w-5 h-5 text-success mt-px"
                    aria-hidden="true"
                  />
                  <span>
                    Saiba se os dados estão saudáveis antes de construir
                    qualquer análise
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 w-5 h-5 text-success mt-px"
                    aria-hidden="true"
                  />
                  <span>
                    Health indicator simples: verde, amarelo, vermelho — sem
                    jargão técnico
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 w-5 h-5 text-success mt-px"
                    aria-hidden="true"
                  />
                  <span>
                    Histórico de anomalias para auditoria e confiança nas
                    métricas
                  </span>
                </li>
              </ul>
            </article>

            <article className="bg-surface border border-border rounded-2xl p-8 shadow-sm flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-shadow transition-transform motion-reduce:transition-none motion-reduce:hover:transform-none">
              <div>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-4 bg-violet-100 text-critical"
                  aria-hidden="true"
                >
                  CT
                </div>
                <p className="text-sm font-semibold text-primary mb-1">
                  CTO / Engineering Lead
                </p>
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Governança de dados sem vender seus dados
                </h3>
                <div className="text-sm text-danger-dark font-medium mb-4 p-3 bg-danger-light rounded-lg border-l-[3px] border-l-danger">
                  &ldquo;Não posso usar ferramentas SaaS que exigem upload dos
                  dados. Compliance não deixa.&rdquo;
                </div>
              </div>
              <ul
                className="flex flex-col gap-3 mt-auto"
                aria-label="Benefícios para CTO"
              >
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 w-5 h-5 text-success mt-px"
                    aria-hidden="true"
                  />
                  <span>
                    Arquitetura híbrida: agente local + dashboard cloud —
                    dados nunca saem
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 w-5 h-5 text-success mt-px"
                    aria-hidden="true"
                  />
                  <span>
                    Instalação em 1 comando. Zero configuração manual de
                    pipelines.
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                  <Check
                    size={16}
                    className="flex-shrink-0 w-5 h-5 text-success mt-px"
                    aria-hidden="true"
                  />
                  <span>
                    Visão consolidada da saúde de todos os data sources da
                    empresa
                  </span>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* ==========================================
            FINAL CTA
            ========================================== */}
        <section
          className="py-24 text-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white"
          aria-labelledby="cta-heading"
        >
          <div className="max-w-[650px] mx-auto px-6">
            <h2
              id="cta-heading"
              className="text-2xl sm:text-3xl font-extrabold leading-tight mb-4"
            >
              Pronto para dormir tranquilo sabendo que seus dados estão
              saudáveis?
            </h2>
            <p className="text-base sm:text-lg opacity-85 leading-relaxed mb-8">
              Comece a monitorar seus dados em minutos. Instalação em 1
              comando. Sem upload de dados.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-10 py-4 text-base bg-white text-blue-900 hover:bg-primary-50 hover:scale-[1.02] shadow-lg motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              Criar conta grátis
            </Link>
            <p className="flex items-center justify-center gap-2 mt-4 text-sm opacity-70">
              <Lock size={16} aria-hidden="true" />
              Seus dados nunca saem do seu servidor.
            </p>
          </div>
        </section>
      </main>

      {/* ==========================================
          FOOTER
          ========================================== */}
      <footer
        role="contentinfo"
        className="bg-surface border-t border-border py-8"
      >
        <div className="flex items-center justify-between max-w-[1200px] mx-auto px-6 flex-wrap gap-4">
          <div className="flex items-center gap-2 font-extrabold text-xl text-text-primary">
            <div
              className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm"
              aria-hidden="true"
            >
              B
            </div>
            <span>Beacon</span>
          </div>
          <p className="text-sm text-text-muted">
            &copy; 2026 Beacon. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </>
  );
}

function ComparisonIcon({ value }: { value: 'yes' | 'no' | 'partial' }) {
  switch (value) {
    case 'yes':
      return (
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success-light text-success text-xs"
          aria-label="Sim"
        >
          <Check size={14} />
        </span>
      );
    case 'no':
      return (
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-danger-light text-danger text-xs"
          aria-label="Não"
        >
          <X size={14} />
        </span>
      );
    case 'partial':
      return (
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-warning-light text-warning text-xs"
          aria-label="Parcial"
        >
          <Minus size={14} />
        </span>
      );
  }
}
