import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Brain,
  FileText,
  FlaskConical,
  HeartPulse,
  Plus,
  ShieldCheck,
} from "lucide-react";
import htcareLogo from "@/assets/brand/htcare-logo.png";
import heroReportBg from "@/assets/brand/htcare-hero-report-bg.png";
import { Carelito } from "@/components/HeartMascot";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HTCare — Exames certos e interpretação cardiovascular" },
      {
        name: "description",
        content:
          "Descubra seu risco cardiovascular, faça o exame certo e entenda cada resultado com Carelito IA e médico parceiro no loop.",
      },
      {
        property: "og:title",
        content: "HTCare — Descubra seu risco, faça o exame certo e entenda cada resultado",
      },
      {
        property: "og:description",
        content:
          "A HTCare indica os exames certos e interpreta seus resultados em linguagem simples.",
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
    title: "Descubra seu risco",
    text: "Responda um questionário de 5 minutos com o Carelito. Receba um score de risco cardiovascular claro, com explicação de cada fator que pesou no resultado.",
  },
  {
    eyebrow: "Passo 2",
    title: "Faça o exame certo",
    text: "Com base no seu perfil, o app recomenda o painel de exames avançados ideal para você — ApoB, resistência à insulina, inflamação. Agende direto pelo app com laboratório parceiro.",
  },
  {
    eyebrow: "Passo 3",
    title: "Médico parceiro no loop",
    text: "Um médico parceiro revisa seu perfil remotamente e autoriza os exames. Sem consulta presencial, sem fila, sem burocracia.",
  },
  {
    eyebrow: "Passo 4",
    title: "Entenda cada resultado",
    text: "O Carelito interpreta cada biomarcador em linguagem simples. Você entende o que aquele número significa para a sua saúde — não só o valor de referência frio.",
  },
  {
    eyebrow: "Passo 5",
    title: "Receba seu protocolo e acompanhe",
    text: "Com base nos seus resultados, receba um plano de 90 dias com ações concretas. Acompanhe a evolução dos seus indicadores ao longo do tempo.",
  },
];

const biomarkerExamples = [
  {
    icon: HeartPulse,
    title: "ApoB 128",
    text: "Acima do ideal. O que isso significa e o que fazer.",
  },
  {
    icon: Brain,
    title: "HOMA-IR 2.8",
    text: "Resistência à insulina no limite.",
  },
  {
    icon: FlaskConical,
    title: "PCR-us 3.2",
    text: "Inflamação moderada detectada.",
  },
];

const faqs = [
  {
    question: "Preciso ir ao médico antes de fazer o exame?",
    answer: "Não. O médico parceiro revisa seu perfil remotamente e autoriza os exames pelo app.",
  },
  {
    question: "O Carelito consegue ler qualquer exame?",
    answer: "Sim. Exames de laboratório particular ou do SUS, em PDF ou foto.",
  },
  {
    question: "Isso substitui consulta médica?",
    answer:
      "Não. É uma ferramenta de triagem e acompanhamento. Quando necessário, conectamos você com um cardiologista parceiro.",
  },
  {
    question: "Quanto custa?",
    answer:
      "A avaliação inicial é gratuita. Os exames têm custo do laboratório parceiro. Em breve, planos de acompanhamento contínuo.",
  },
  {
    question: "Para quem é a HTCare?",
    answer:
      "Para qualquer pessoa que quer entender sua saúde cardiovascular sem esperar meses por consulta.",
  },
];

const navItems = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Carelito IA", href: "#carelito" },
  { label: "Para profissionais", href: "#profissionais" },
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
  const [showVisitorWelcome, setShowVisitorWelcome] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroBgY = useTransform(heroProgress, [0, 1], ["0%", "22%"]);
  const heroBgScale = useTransform(heroProgress, [0, 1], [1, 1.18]);
  const heroContentY = useTransform(heroProgress, [0, 1], [0, 140]);
  const heroContentOpacity = useTransform(heroProgress, [0, 1], [1, 0]);

  const { scrollYProgress: pageProgress } = useScroll();
  const progressWidth = useTransform(pageProgress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    const seen = window.localStorage.getItem("htcare:visitor-welcome-seen") === "true";
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (seen || !isMobile) return;

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setShowVisitorWelcome(true);
    });
  }, []);

  function dismissVisitorWelcome() {
    window.localStorage.setItem("htcare:visitor-welcome-seen", "true");
    setShowVisitorWelcome(false);
  }

  return (
    <div className="min-h-screen bg-[#fbfcfc] text-[#10201f]">
      <AnimatePresence>
        {showVisitorWelcome && <MobileVisitorWelcome onDismiss={dismissVisitorWelcome} />}
      </AnimatePresence>
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
                Risco cardiovascular, exames e interpretação
              </p>
              <h1 className="mx-auto max-w-5xl font-sans text-[clamp(3rem,6.8vw,6.6rem)] font-semibold leading-[0.94] tracking-normal text-[#10201f]">
                Descubra o risco do seu coração. Faça o exame certo. Entenda cada resultado.
              </h1>
              <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-[#536b68] sm:text-xl">
                A HTCare descobre seu risco cardiovascular, indica os exames certos, e explica o que
                cada resultado significa — com médico parceiro no loop e Carelito IA interpretando
                tudo em linguagem simples.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <Button size="xl" className="rounded-full bg-[#10201f] px-7 font-semibold" asChild>
                  <a href="/auth?mode=signup">
                    Começar agora — é gratuito <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  className="rounded-full border-[#10201f]/12 bg-white/60 px-7 font-semibold text-[#10201f] shadow-soft backdrop-blur hover:bg-white"
                  asChild
                >
                  <a href="#como-funciona">Ver como funciona</a>
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap justify-center gap-3 text-sm text-[#536b68]">
                <TrustPill icon={HeartPulse} label="Score de risco claro" />
                <TrustPill icon={FlaskConical} label="Exames certos" />
                <TrustPill icon={FileText} label="Resultado explicado" />
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section id="sobre" className="bg-white px-6 py-20 text-[#10201f] sm:py-28">
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

        <section id="como-funciona" className="bg-[#10201f] px-6 py-20 text-white sm:py-28">
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
                Da primeira avaliação ao protocolo de 90 dias.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/64">
                A HTCare organiza o caminho inteiro: descobre risco, indica exame, coloca médico no
                loop, traduz o resultado e acompanha sua evolução.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
              className="mt-14 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/12 md:grid-cols-2 lg:grid-cols-5"
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

        <section
          id="carelito"
          className="overflow-hidden bg-white px-6 py-20 text-[#10201f] sm:py-28"
        >
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                Carelito IA
              </p>
              <h2 className="mt-4 max-w-3xl font-sans text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
                Tem um exame que não entendeu? O Carelito explica.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#536b68]">
                Seja do SUS ou de laboratório particular — fotografe ou envie o PDF. O Carelito
                interpreta cada resultado em linguagem simples e te diz o que fazer.
              </p>
              <div className="mt-8 flex items-center gap-4 rounded-[1.5rem] border border-[#10201f]/8 bg-[#f7f9f8] p-4">
                <Carelito className="h-20 w-20 shrink-0" expression="confident" />
                <p className="text-base font-medium leading-7 text-[#304643]">
                  Em vez de mostrar uma tabela fria, a HTCare transforma biomarcadores em contexto,
                  prioridade e próximo passo.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
              className="grid gap-4"
            >
              {biomarkerExamples.map((item) => (
                <motion.article
                  key={item.title}
                  variants={revealItem}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.24, ease: EASE }}
                  className="rounded-[1.5rem] border border-[#10201f]/8 bg-white p-6 shadow-[0_28px_90px_-72px_rgba(16,32,31,0.58)]"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#edf8f5] text-[#2f6760]">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-sans text-2xl font-semibold tracking-normal">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-base leading-7 text-[#536b68]">{item.text}</p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="profissionais" className="bg-[#f7f9f8] px-6 py-20 text-[#10201f] sm:py-28">
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
                  Seus pacientes chegam até você com histórico levantado, risco identificado, e
                  exames prontos. Você foca na conversa clínica que importa.
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

function MobileVisitorWelcome({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="fixed inset-0 z-[90] overflow-y-auto bg-[#f8fbff] px-5 py-5 text-[#10201f] md:hidden"
    >
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col">
        <header className="flex items-center justify-between">
          <img src={htcareLogo} alt="HTCare" className="h-11 w-auto object-contain" />
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-10 rounded-full bg-white px-4 text-sm font-bold text-[#536b68] shadow-soft"
          >
            Conhecer site
          </button>
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-[2.2rem] border border-[#10201f]/8 bg-white p-5 shadow-[0_28px_110px_-70px_rgba(16,32,31,0.78)]"
          >
            <div className="flex items-center gap-4">
              <Carelito className="h-28 w-28 shrink-0" expression="happy" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f8fc8]">
                  Bem-vindo
                </p>
                <h1 className="mt-2 font-sans text-3xl font-semibold leading-[1.02]">
                  Sua jornada do coração começa aqui.
                </h1>
              </div>
            </div>

            <p className="mt-5 text-base font-medium leading-7 text-[#536b68]">
              Em poucos minutos, você entende seu risco cardiovascular, sabe quais exames fazem
              sentido e recebe explicações simples sobre seus resultados.
            </p>

            <div className="mt-5 grid gap-2.5">
              {[
                "Score cardiovascular claro",
                "Exames certos para seu perfil",
                "Interpretação em linguagem simples",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#f7faf9] p-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f5ef] text-[#2f6760]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-bold">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="mt-5 grid gap-3">
            <Button
              size="xl"
              className="min-h-14 rounded-[1.35rem] bg-[#10201f] text-base font-semibold text-white"
              asChild
              onClick={onDismiss}
            >
              <Link to="/auth" search={{ mode: "signup" } as never}>
                Começar gratuitamente <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="min-h-14 rounded-[1.35rem] bg-white text-base font-semibold"
              asChild
              onClick={onDismiss}
            >
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
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
