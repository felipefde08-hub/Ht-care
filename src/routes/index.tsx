import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import {
  ArrowRight,
  HeartPulse,
  Plus,
  Repeat2,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserRound,
} from "lucide-react";
import htcareLogo from "@/assets/brand/htcare-logo.png";
import heroReportBg from "@/assets/brand/htcare-hero-report-bg.png";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HTCare — Risco cardiovascular e metabólico" },
      {
        name: "description",
        content:
          "Acompanhe seu risco cardiovascular e metabólico com base em diretrizes da OMS e da Sociedade Brasileira de Cardiologia.",
      },
      {
        property: "og:title",
        content: "HTCare — Acompanhe seu risco cardiovascular e metabólico",
      },
      {
        property: "og:description",
        content: "Baseado em diretrizes da OMS e da Sociedade Brasileira de Cardiologia.",
      },
    ],
  }),
  component: Landing,
});

const facts = [
  {
    value: "1.096",
    text: "Brasileiros morrem por dia de doenças cardiovasculares — a principal causa de morte no país.",
  },
  {
    value: "+50%",
    text: "dos hipertensos no Brasil não sabem que têm a doença, segundo a OMS.",
  },
  {
    value: "44%",
    text: "das pessoas com diabetes no Brasil não sabem que têm a doença.",
  },
  {
    value: "2x a 3x",
    text: "maior o risco de morte cardiovascular quando hipertensão e diabetes aparecem juntas.",
  },
  {
    value: "Nº1",
    text: "O infarto é a maior causa de morte cardiovascular em todos os estados brasileiros.",
  },
];

const steps = [
  {
    eyebrow: "Passo 1",
    title: "Responda em poucos minutos",
    text: "Um questionário rápido sobre seus hábitos, histórico familiar e saúde atual. Sem precisar de exame nenhum pra começar.",
  },
  {
    eyebrow: "Passo 2",
    title: "Receba seu score de risco",
    text: "Baseado em diretrizes da OMS e da Sociedade Brasileira de Cardiologia, você vê exatamente onde está e o que está pesando no seu resultado.",
  },
  {
    eyebrow: "Passo 3",
    title: "Acompanhe sua evolução",
    text: "Acompanhe sua evolução ao longo do tempo, em vez de descobrir tudo de uma vez só. Seu score muda conforme você muda — e você vê isso acontecer.",
  },
];

const differentiators = [
  {
    icon: ShieldCheck,
    title: "Baseado em diretrizes reais",
    text: "Cada cálculo de risco segue critérios oficiais usados por cardiologistas — não é uma fórmula inventada por nós.",
  },
  {
    icon: UserRound,
    title: "Você não é uma média",
    text: "Cada pessoa tem fatores de risco únicos. Metas de população não servem pra gerenciar o risco individual de cada um.",
  },
  {
    icon: Repeat2,
    title: "Acompanhamento, não só uma foto",
    text: "Risco não é estático. Você refaz sua avaliação com o tempo e vê se está melhorando, estável ou piorando.",
  },
];

const faqs = [
  {
    question: "O que diferencia a HTCare de um teste de risco qualquer?",
    answer:
      "Não usamos uma fórmula genérica. Cruzamos seu histórico, hábitos e sintomas com diretrizes oficiais de risco cardiovascular pra te dar um resultado personalizado, não uma média de população.",
  },
  {
    question: "Isso substitui consulta médica?",
    answer:
      "Não. A HTCare é uma ferramenta de triagem e acompanhamento, não um diagnóstico. Se seu risco aparecer moderado ou alto, recomendamos buscar avaliação com um cardiologista.",
  },
  {
    question: "Preciso fazer exame de sangue pra começar?",
    answer:
      "Não. Você pode começar sua avaliação só respondendo o questionário. Se fizer sentido, depois te ajudamos a entender se vale a pena fazer exames complementares.",
  },
  {
    question: "É realmente gratuito?",
    answer:
      "Sim, a avaliação inicial e o acompanhamento básico são gratuitos. No futuro, oferecemos recursos extras opcionais para quem quiser um acompanhamento mais completo.",
  },
  {
    question: "Para quem é a HTCare?",
    answer:
      "Para qualquer adulto que queira entender seu risco cardiovascular e metabólico — principalmente quem tem histórico familiar, já foi diagnosticado com pré-diabetes/diabetes, ou só quer acompanhar a própria saúde de forma preventiva.",
  },
  {
    question: "O resultado vai me dizer exatamente o que fazer?",
    answer:
      "Você recebe um relatório claro com os fatores que mais pesam no seu risco e o que normalmente é recomendado para reduzir cada um deles — sempre como ponto de partida para conversar com seu médico, não como prescrição.",
  },
];

const navItems = [
  { label: "Sobre", href: "#sobre" },
  { label: "Para pacientes", href: "/para-pacientes" },
  { label: "Para profissionais de saúde", href: "/para-profissionais" },
  { label: "FAQ", href: "#faq" },
];

const EASE = [0.22, 1, 0.36, 1];

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

const revealItem = {
  hidden: { opacity: 0, y: 28, scale: 0.96, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: EASE },
  },
};

function Landing() {
  const [openFaq, setOpenFaq] = useState(faqs[0]?.question ?? "");
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroBgY = useTransform(heroProgress, [0, 1], ["0%", "22%"]);
  const heroBgScale = useTransform(heroProgress, [0, 1], [1, 1.18]);
  const heroContentY = useTransform(heroProgress, [0, 1], [0, 140]);
  const heroContentOpacity = useTransform(heroProgress, [0, 1], [1, 0]);

  const omsRef = useRef(null);
  const { scrollYProgress: omsProgress } = useScroll({
    target: omsRef,
    offset: ["start end", "end start"],
  });
  const omsCardY = useTransform(omsProgress, [0, 1], [60, -60]);
  const omsTextY = useTransform(omsProgress, [0, 1], [30, -30]);

  const { scrollYProgress: pageProgress } = useScroll();
  const progressWidth = useTransform(pageProgress, [0, 1], ["0%", "100%"]);

  return (
    <div className="min-h-screen bg-[#fbfcfc] text-[#10201f]">
      <motion.div
        className="fixed left-0 top-0 z-[60] h-0.5 bg-[#10201f]"
        style={{ width: progressWidth }}
      />
      <header className="fixed left-0 right-0 top-0 z-50 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full border border-white/70 bg-white/72 px-4 py-2.5 shadow-[0_18px_60px_-42px_rgba(16,32,31,0.45)] backdrop-blur-2xl">
          <div className="flex min-w-0 items-center gap-7">
            <img src={htcareLogo} alt="HTCare" className="h-10 w-auto shrink-0 object-contain" />
            <nav className="hidden items-center gap-6 text-sm font-medium text-[#10201f]/68 md:flex">
              {navItems.map((item) =>
                item.href.startsWith("/") ? (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="whitespace-nowrap transition hover:text-[#10201f]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap transition hover:text-[#10201f]"
                  >
                    {item.label}
                  </a>
                ),
              )}
            </nav>
          </div>
          <Link
            to="/auth"
            className="whitespace-nowrap rounded-full bg-[#10201f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_30px_-18px_rgba(16,32,31,0.9)] transition hover:bg-[#1f3b38]"
          >
            Fazer login
          </Link>
        </div>
      </header>

      <main>
        <section
          ref={heroRef}
          className="relative isolate -mt-20 overflow-hidden px-5 pb-20 pt-52 sm:px-8 sm:pb-28 sm:pt-60 lg:px-12"
        >
          <motion.div className="absolute inset-0 z-0" style={{ y: heroBgY }}>
            <div className="absolute inset-0 bg-[#f5f8f7]" />
            <motion.img
              src={heroReportBg}
              alt=""
              style={{ scale: heroBgScale }}
              className="absolute inset-0 h-full w-full object-cover object-center opacity-72 saturate-95"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,255,255,0.36),rgba(255,255,255,0.58)_44%,rgba(245,248,247,0.82)_82%)]" />
          </motion.div>
          <motion.div
            style={{ y: heroContentY, opacity: heroContentOpacity }}
            className="relative z-10 mx-auto flex min-h-[760px] max-w-6xl items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              <p className="mb-6 inline-flex rounded-full border border-[#10201f]/10 bg-white/70 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#486461] shadow-soft backdrop-blur">
                Baseado em diretrizes médicas
              </p>
              <h1 className="mx-auto max-w-4xl font-sans text-[clamp(3.2rem,7.2vw,7rem)] font-semibold leading-[0.94] tracking-normal text-[#10201f]">
                Monitore sua saúde com inteligência.
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-[#536b68] sm:text-xl">
                Dados organizados, acompanhamento contínuo e análises baseadas em evidências para
                ajudar você a tomar melhores decisões sobre sua saúde.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <Button size="xl" className="rounded-full bg-[#10201f] px-7 font-semibold" asChild>
                  <a href="/auth?mode=signup">
                    Criar conta gratuita <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  className="rounded-full border-[#10201f]/12 bg-white/60 px-7 font-semibold text-[#10201f] shadow-soft backdrop-blur hover:bg-white"
                  asChild
                >
                  <a href="#pacientes">Ver demonstração</a>
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  className="rounded-full border-[#10201f]/12 bg-white/60 px-7 font-semibold text-[#10201f] shadow-soft backdrop-blur hover:bg-white"
                  asChild
                >
                  <Link to="/relatorio">Ver meu score</Link>
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap justify-center gap-3 text-sm text-[#536b68]">
                <TrustPill icon={ShieldCheck} label="Diretrizes reconhecidas" />
                <TrustPill icon={HeartPulse} label="Risco cardiovascular" />
                <TrustPill icon={TrendingUp} label="Evolução contínua" />
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section id="sobre" className="overflow-hidden bg-white px-6 py-24 text-[#10201f] sm:py-36">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="grid gap-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#6f8581]">
                  Precisão para a vida real
                </p>
                <h2 className="mt-5 max-w-3xl font-sans text-[clamp(2.7rem,5.6vw,5.9rem)] font-semibold leading-[0.98] tracking-normal">
                  Vá além do que as calculadoras tradicionais mostram
                </h2>
                <p className="mt-8 max-w-xl text-lg leading-8 text-[#536b68]">
                  A maioria das avaliações de risco usa só 4 ou 5 informações básicas — idade,
                  pressão, colesterol. A HTCare cruza seu histórico clínico, hábitos de vida,
                  sintomas e fatores familiares pra te dar uma visão mais completa do seu risco
                  real, não uma média genérica de população.
                </p>
              </div>
              <HTCareProductDemo />
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
              className="mt-16 grid gap-5 md:grid-cols-3"
            >
              {differentiators.map((item) => (
                <motion.article
                  key={item.title}
                  variants={revealItem}
                  whileHover={{ y: -8, scale: 1.01 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="group rounded-[1.65rem] border border-[#10201f]/[0.07] bg-white/82 p-7 shadow-[0_28px_90px_-72px_rgba(16,32,31,0.58)] backdrop-blur-xl transition-colors hover:border-[#10201f]/14 hover:bg-white sm:p-8"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-[#10201f]/8 bg-[#f7faf9] text-[#2f6760] transition group-hover:bg-[#10201f] group-hover:text-white">
                      <item.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="h-px flex-1 bg-[#10201f]/8" />
                  </div>
                  <h3 className="mt-8 max-w-xs font-sans text-2xl font-semibold leading-tight tracking-normal">
                    {item.title}
                  </h3>
                  <p className="mt-5 text-base leading-7 text-[#536b68]">{item.text}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section ref={omsRef} className="bg-[#f7f9f8] px-6 py-20 text-[#10201f] sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 rounded-[2rem] border border-[#10201f]/8 bg-white p-7 shadow-[0_30px_120px_-86px_rgba(16,32,31,0.55)] sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ y: omsCardY }}
              className="rounded-[1.5rem] bg-[#10201f] p-8 text-white"
            >
              <Stethoscope className="h-8 w-8 text-white/72" />
              <p className="mt-20 text-xs font-semibold uppercase tracking-[0.24em] text-white/48">
                Diretrizes clínicas
              </p>
              <p className="mt-4 font-sans text-5xl font-semibold leading-none">OMS + SBC</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
              style={{ y: omsTextY }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                Construído sobre ciência, não suposição.
              </p>
              <h2 className="mt-4 max-w-3xl font-sans text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
                Critérios reconhecidos, apresentados de forma clara.
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[#536b68]">
                Nosso cálculo de risco segue os mesmos parâmetros clínicos usados por cardiologistas
                no Brasil e recomendados pela Organização Mundial da Saúde — não inventamos critério
                próprio.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="bg-white px-6 py-20 text-[#10201f] sm:py-28">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                Contexto
              </p>
              <h2 className="mt-4 font-sans text-3xl font-semibold tracking-normal sm:text-4xl">
                Você sabia?
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
              className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-6"
            >
              {facts.map((fact) => (
                <motion.article
                  key={fact.value}
                  variants={revealItem}
                  className="rounded-[1.5rem] border border-[#10201f]/8 bg-[#f7f9f8] p-6 shadow-[0_20px_80px_-64px_rgba(16,32,31,0.45)] lg:col-span-2"
                >
                  <p className="font-sans text-5xl font-semibold tracking-normal text-[#10201f] sm:text-6xl">
                    {fact.value}
                  </p>
                  <p className="mt-6 text-base leading-7 text-[#536b68]">{fact.text}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="bg-[#f7f9f8] px-6 py-20 text-[#10201f] sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                Prevenção começa com dados
              </p>
              <h2 className="mt-4 max-w-3xl font-sans text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
                Entender cedo muda a conversa.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#536b68]">
                Testes e acompanhamento cardiológico ajudam a identificar fatores de risco antes que
                eles virem urgência. A HTCare organiza esse primeiro mapa para você conversar melhor
                com seu médico.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
              className="overflow-hidden rounded-[2rem] border border-[#10201f]/8 bg-[#10201f] shadow-[0_30px_120px_-70px_rgba(16,32,31,0.7)]"
            >
              <div className="aspect-video">
                <iframe
                  className="h-full w-full"
                  src="https://www.youtube.com/embed/v-UI0PmZPFQ"
                  title="Importância dos testes cardiológicos"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </div>
        </section>

        <section id="pacientes" className="bg-[#10201f] px-6 py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-3xl"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">
                Como funciona
              </p>
              <h2 className="mt-4 font-sans text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
                3 passos simples. 100% gratuito. Uma visão clara do seu risco cardiovascular.
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
              className="mt-14 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/12 md:grid-cols-3"
            >
              {steps.map((step) => (
                <motion.article
                  key={step.eyebrow}
                  variants={revealItem}
                  className="bg-[#10201f] p-7 sm:p-8"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                    {step.eyebrow}
                  </p>
                  <h3 className="mt-5 font-sans text-2xl font-semibold tracking-normal text-white">
                    {step.title}
                  </h3>
                  <p className="mt-5 text-base leading-7 text-white/66">{step.text}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="bg-white px-6 py-20 text-[#10201f] sm:py-28">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-[#10201f]/8 bg-[#f7f9f8] p-8 sm:p-12">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                  Para profissionais de saúde
                </p>
                <h2 className="mt-4 max-w-2xl font-sans text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                  É cardiologista ou clínico geral?
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#536b68]">
                  Veja como a HTCare faz a triagem antes do paciente chegar até você — sem mudar sua
                  rotina.
                </p>
              </div>
              <Button
                size="xl"
                className="shrink-0 rounded-full bg-[#10201f] px-7 font-semibold"
                asChild
              >
                <Link to="/para-profissionais">
                  Ver para profissionais <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        <section id="faq" className="bg-[#f7f9f8] px-6 py-24 text-[#10201f] sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="lg:sticky lg:top-28"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                FAQ
              </p>
              <h2 className="mt-4 max-w-xl font-sans text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
                Dúvidas, sem ruído.
              </h2>
              <p className="mt-6 max-w-md text-lg leading-8 text-[#536b68]">
                Respostas rápidas sobre risco, acompanhamento e o papel da HTCare antes da conversa
                médica.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
              className="grid gap-3"
            >
              {faqs.map((faq) => (
                <motion.div
                  key={faq.question}
                  variants={revealItem}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="overflow-hidden rounded-[1.45rem] border border-[#10201f]/[0.07] bg-white/86 shadow-[0_24px_90px_-72px_rgba(16,32,31,0.65)] backdrop-blur-xl"
                >
                  <button
                    type="button"
                    aria-expanded={openFaq === faq.question}
                    onClick={() =>
                      setOpenFaq((current) => (current === faq.question ? "" : faq.question))
                    }
                    className="flex w-full items-center justify-between gap-5 px-6 py-6 text-left transition hover:bg-[#f8fbfa]/72 sm:px-7"
                  >
                    <span className="font-sans text-xl font-semibold leading-snug">
                      {faq.question}
                    </span>
                    <motion.span
                      animate={{ rotate: openFaq === faq.question ? 45 : 0 }}
                      transition={{ duration: 0.24, ease: EASE }}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#10201f]/8 bg-[#f7faf9] text-[#10201f]"
                    >
                      <Plus className="h-4 w-4" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {openFaq === faq.question && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.34, ease: EASE }}
                      >
                        <div className="px-6 pb-7 pt-0 sm:px-7">
                          <div className="h-px bg-[#10201f]/8" />
                          <p className="max-w-3xl pt-5 text-base leading-7 text-[#536b68]">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function HTCareProductDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, ease: EASE, delay: 0.08 }}
      className="relative min-h-[540px] lg:min-h-[620px]"
    >
      <div className="absolute inset-x-4 top-12 h-[430px] rounded-[3rem] border border-[#10201f]/6 bg-[#f8fbfa]/70 shadow-[0_45px_140px_-92px_rgba(16,32,31,0.72)] backdrop-blur-2xl" />

      <motion.div
        whileHover={{ y: -10, rotate: -2.5 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="absolute left-0 top-28 hidden w-[255px] rotate-[-7deg] rounded-[1.6rem] border border-[#10201f]/8 bg-white/88 p-5 shadow-[0_32px_90px_-58px_rgba(16,32,31,0.74)] backdrop-blur-xl sm:block"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78908d]">
            Relatório
          </p>
          <span className="h-2 w-2 rounded-full bg-[#2f9e72]" />
        </div>
        <h3 className="mt-5 font-sans text-xl font-semibold">Risco metabólico</h3>
        <div className="mt-5 space-y-4">
          {[
            ["Glicemia", "92"],
            ["LDL", "118"],
            ["HDL", "54"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-[#10201f]/8 pb-3"
            >
              <span className="text-sm text-[#536b68]">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex h-16 items-end gap-2">
          {[42, 58, 36, 72, 48, 66, 78].map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-full bg-[#2f6760]/18"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        whileHover={{ y: -12, rotate: 1.5 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="absolute right-0 top-0 w-full max-w-[470px] rounded-[2rem] border border-[#10201f]/8 bg-white/92 p-6 shadow-[0_38px_120px_-70px_rgba(16,32,31,0.78)] backdrop-blur-xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]">
              HTCare Score
            </p>
            <h3 className="mt-4 font-sans text-3xl font-semibold leading-tight">
              Visão cardiovascular
            </h3>
          </div>
          <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full bg-[conic-gradient(#2f9e72_0_76%,#e6eeeb_76%_100%)]">
            <div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-white text-center shadow-inner">
              <div>
                <p className="font-sans text-4xl font-semibold">76</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#78908d]">
                  baixo
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[1.35rem] border border-[#10201f]/7 bg-[#f8fbfa] p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Evolução do score</p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f6760]">
              +4 pts
            </span>
          </div>
          <div className="mt-6 h-28 overflow-hidden rounded-2xl bg-white p-4">
            <svg viewBox="0 0 420 120" className="h-full w-full" aria-hidden="true">
              <path
                d="M0 86 C42 70 58 90 96 74 C132 59 145 62 177 50 C214 36 236 58 272 45 C313 30 340 43 420 23"
                fill="none"
                stroke="#2f6760"
                strokeLinecap="round"
                strokeWidth="5"
              />
              <path
                d="M0 86 C42 70 58 90 96 74 C132 59 145 62 177 50 C214 36 236 58 272 45 C313 30 340 43 420 23 L420 120 L0 120 Z"
                fill="rgba(47,103,96,0.08)"
              />
            </svg>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Pressão", "128/82"],
            ["Metabólico", "Estável"],
            ["Check-ins", "7"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.15rem] border border-[#10201f]/7 bg-white p-4">
              <p className="text-xs font-medium text-[#78908d]">{label}</p>
              <p className="mt-2 font-sans text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        whileHover={{ y: -10, rotate: -0.8 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="absolute bottom-0 left-[8%] w-[78%] rounded-[1.8rem] border border-[#10201f]/8 bg-white/86 p-6 shadow-[0_36px_110px_-72px_rgba(16,32,31,0.8)] backdrop-blur-xl sm:w-[430px]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]">
              Fatores que pesaram
            </p>
            <h3 className="mt-3 font-sans text-2xl font-semibold">Relatório personalizado</h3>
          </div>
          <span className="rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-semibold text-[#9a5b12]">
            revisar
          </span>
        </div>
        <div className="mt-6 grid gap-3">
          {[
            ["Pressão sistólica acima do ideal", "Médio"],
            ["Histórico familiar informado", "Atenção"],
            ["Tabagismo ausente", "Positivo"],
          ].map(([label, status]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-2xl bg-[#f7faf9] p-4"
            >
              <span className="text-sm font-medium text-[#304643]">{label}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#78908d]">
                {status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TrustPill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#10201f]/8 bg-white/70 px-3 py-2 backdrop-blur">
      <Icon className="h-4 w-4 text-[#2f6760]" />
      {label}
    </span>
  );
}
