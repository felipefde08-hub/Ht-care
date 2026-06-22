import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView } from "motion/react";
import { HeartPulse, ShieldCheck, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import htcareLogo from "@/assets/brand/htcare-logo.png";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/para-pacientes")({
  head: () => ({
    meta: [
      { title: "Para pacientes — HTCare" },
      {
        name: "description",
        content:
          "Descubra seu risco cardiovascular e metabólico em poucos minutos, de forma gratuita e sem precisar de exame para começar.",
      },
    ],
  }),
  component: ParaPacientes,
});

const EASE = [0.22, 1, 0.36, 1] as const;

const painCards = [
  {
    value: 50,
    prefix: "+",
    suffix: "%",
    title: "Mais da metade dos hipertensos no Brasil não sabe que tem a doença",
    text: "Você pode estar entre eles, sem nenhum sintoma visível ainda.",
  },
  {
    value: 44,
    suffix: "%",
    title: "Quase metade dos diabéticos não sabe que tem diabetes",
    text: "O risco cresce silenciosamente até o primeiro sintoma aparecer.",
  },
  {
    value: 1096,
    title: "Pessoas morrem por dia de doença cardiovascular no Brasil",
    text: "A maior causa de morte no país — e boa parte é evitável com diagnóstico a tempo.",
  },
];

const steps = [
  "Responda algumas perguntas sobre você — sem precisar de exame, em poucos minutos.",
  "Veja seu score de risco, explicado de forma clara, não em números frios de laboratório.",
  "Acompanhe sua evolução — refaça quando quiser e veja se está melhorando.",
];

const audience = [
  "Tem histórico de pressão alta, diabetes ou doença cardíaca na família",
  "Já foi diagnosticado com pré-diabetes ou diabetes",
  "Sente que não tem controle real sobre sua saúde do coração",
  "Só quer entender melhor seu próprio risco, mesmo sem sintoma nenhum hoje",
];

function ParaPacientes() {
  return (
    <div className="min-h-screen bg-[#fbfcfc] text-[#10201f]">
      <header className="fixed left-0 right-0 top-0 z-50 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full border border-white/70 bg-white/72 px-4 py-2.5 shadow-[0_18px_60px_-42px_rgba(16,32,31,0.45)] backdrop-blur-2xl">
          <div className="flex min-w-0 items-center gap-7">
            <Link to="/">
              <img src={htcareLogo} alt="HTCare" className="h-10 w-auto shrink-0 object-contain" />
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-[#10201f]/68 md:flex">
              <a href="#dor" className="transition hover:text-[#10201f]">
                Por que importa
              </a>
              <a href="#como-funciona" className="transition hover:text-[#10201f]">
                Como funciona
              </a>
              <a href="#para-quem" className="transition hover:text-[#10201f]">
                Para quem é
              </a>
            </nav>
          </div>
          <Button size="sm" className="rounded-full bg-[#10201f] font-semibold" asChild>
            <Link to="/auth">Fazer avaliação</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden px-6 pb-24 pt-44 sm:pb-32 sm:pt-52">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(47,103,96,0.12),rgba(251,252,252,0.7)_48%,#fbfcfc_78%)]" />
          <HeroIntelligenceBackground />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="inline-flex rounded-full border border-[#10201f]/10 bg-white/70 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#486461] shadow-soft backdrop-blur"
              >
                Para pacientes
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: EASE, delay: 0.08 }}
                className="mt-7 max-w-4xl font-sans text-[clamp(3rem,7vw,6.7rem)] font-semibold leading-[0.96] tracking-normal"
              >
                Sua saúde do coração não devia ser um mistério
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: EASE, delay: 0.18 }}
                className="mt-7 max-w-2xl text-lg leading-8 text-[#536b68] sm:text-xl"
              >
                Descubra seu risco cardiovascular e metabólico em poucos minutos — gratuito, sem
                fila, sem precisar de exame pra começar.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: EASE, delay: 0.28 }}
                className="mt-10"
              >
                <Button
                  size="xl"
                  className="rounded-full bg-[#10201f] px-7 font-semibold transition-transform hover:scale-[1.02]"
                  asChild
                >
                  <Link to="/auth">
                    Fazer minha avaliação gratuita <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.75, ease: EASE, delay: 0.22 }}
              className="relative mx-auto grid h-[360px] w-full max-w-[430px] place-items-center sm:h-[460px]"
            >
              <div className="absolute inset-8 rounded-full border border-[#10201f]/8 bg-white/62 shadow-[0_40px_130px_-92px_rgba(16,32,31,0.72)] backdrop-blur-2xl" />
              <FloatingHealthCard
                className="left-0 top-8 sm:-left-8 sm:top-16"
                eyebrow="Evolução do risco"
                value="-12%"
                text="melhora em 90 dias"
                chart={[72, 66, 64, 59, 56, 52]}
              />
              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut" }}
                className="relative grid h-44 w-44 place-items-center rounded-full bg-[#10201f] text-white shadow-[0_30px_90px_-52px_rgba(16,32,31,0.75)] sm:h-56 sm:w-56"
              >
                <HeartPulse className="h-20 w-20 sm:h-24 sm:w-24" />
              </motion.div>
              <FloatingHealthCard
                className="bottom-2 left-2 sm:bottom-8 sm:left-8"
                eyebrow="Histórico de saúde"
                value="8"
                text="check-ins salvos"
                chart={[34, 48, 42, 58, 64, 70]}
              />
              <FloatingHealthCard
                className="right-0 top-8 sm:-right-6 sm:top-12"
                eyebrow="Tendências positivas"
                value="+4 pts"
                text="score atualizado"
                chart={[42, 46, 45, 56, 62, 68]}
              />
            </motion.div>
          </div>
        </section>

        <section id="dor" className="bg-white px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="Por que isso importa"
              title="A maioria das pessoas só descobre tarde demais"
            />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {painCards.map((card, index) => (
                <CountUpCard key={card.title} card={card} delay={index * 0.24} />
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-[#10201f] px-6 py-24 text-white sm:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="Como funciona"
              title="Simples, rápido, e sem custo pra começar"
              dark
            />
            <div className="relative mt-16">
              <motion.svg
                className="absolute left-[10%] top-10 hidden h-8 w-[80%] md:block"
                viewBox="0 0 900 60"
                fill="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M4 34 C190 4 302 58 450 30 C613 0 720 54 896 22"
                  stroke="rgba(255,255,255,0.34)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, margin: "-120px" }}
                  transition={{ duration: 1.25, ease: EASE }}
                />
              </motion.svg>
              <div className="grid gap-5 md:grid-cols-3">
                {steps.map((step, index) => (
                  <motion.article
                    key={step}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.62, ease: EASE, delay: index * 0.12 }}
                    className="relative rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 backdrop-blur-xl"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#10201f] font-sans text-lg font-semibold">
                      {index + 1}
                    </span>
                    <p className="mt-8 text-lg leading-8 text-white/72">{step}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="para-quem" className="bg-[#fbfcfc] px-6 py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <SectionIntro eyebrow="Identificação" title="Feito para você, se..." />
            <div className="grid gap-3">
              {audience.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.52, ease: EASE, delay: index * 0.08 }}
                  className="flex items-start gap-4 rounded-[1.45rem] border border-[#10201f]/8 bg-white p-5 shadow-[0_20px_80px_-68px_rgba(16,32,31,0.48)]"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6760]" />
                  <p className="text-lg leading-7 text-[#304643]">{item}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-10 rounded-[2rem] border border-[#10201f]/8 bg-[#f7faf9] p-7 shadow-[0_30px_120px_-88px_rgba(16,32,31,0.6)] sm:p-10 lg:grid-cols-[0.35fr_1fr] lg:items-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-[#2f6760] shadow-soft">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                Tranquilidade
              </p>
              <h2 className="mt-4 font-sans text-4xl font-semibold leading-tight sm:text-6xl">
                Você não está sozinho nisso
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[#536b68]">
                Sabemos que falar sobre risco de doença grave pode gerar ansiedade. Por isso, cada
                resultado vem acompanhado de uma explicação clara do que ele significa e dos
                próximos passos recomendados — nunca apenas um número solto te deixando sem saber o
                que fazer.
              </p>
              <p className="mt-6 max-w-3xl rounded-2xl border border-[#10201f]/8 bg-white p-4 text-sm leading-6 text-[#536b68]">
                Esta é uma ferramenta de triagem e acompanhamento, não substitui consulta médica.
              </p>
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden px-6 py-24 text-center sm:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(47,103,96,0.14),rgba(251,252,252,0.75)_48%,#fbfcfc_78%)]" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease: EASE }}
            className="relative z-10 mx-auto max-w-4xl"
          >
            <Sparkles className="mx-auto h-8 w-8 text-[#2f6760]" />
            <h2 className="mt-6 font-sans text-4xl font-semibold leading-tight sm:text-6xl">
              Leva menos de 5 minutos para começar a entender seu risco
            </h2>
            <Button
              size="xl"
              className="mt-9 rounded-full bg-[#10201f] px-7 font-semibold transition-transform hover:scale-[1.02]"
              asChild
            >
              <Link to="/auth">
                Fazer minha avaliação gratuita <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  dark?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: EASE }}
      className="max-w-3xl"
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.24em] ${
          dark ? "text-white/48" : "text-[#536b68]"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-4 font-sans text-4xl font-semibold leading-tight tracking-normal sm:text-6xl ${
          dark ? "text-white" : "text-[#10201f]"
        }`}
      >
        {title}
      </h2>
    </motion.div>
  );
}

function HeroIntelligenceBackground() {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      animate={{ x: [0, 18, 0], y: [0, -14, 0] }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 760" fill="none">
        <path
          d="M-90 250 C105 160 180 360 330 250 C465 150 522 205 625 206 C760 207 756 110 906 155 C1044 196 1112 340 1530 182"
          stroke="rgba(16,32,31,0.045)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M-80 482 C95 432 182 458 292 404 C394 354 420 312 490 330 L532 330 L548 276 L578 398 L610 330 C706 328 756 294 846 310 C1014 340 1140 486 1524 350"
          stroke="rgba(47,103,96,0.05)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M118 115 C300 96 360 185 520 142 C658 105 760 72 916 108 C1058 141 1156 112 1328 74"
          stroke="rgba(16,32,31,0.032)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {[
          [248, 306],
          [432, 238],
          [548, 276],
          [610, 330],
          [760, 207],
          [906, 155],
          [1014, 340],
          [1220, 404],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="4" fill="rgba(47,103,96,0.055)" />
            <circle cx={cx} cy={cy} r="11" stroke="rgba(47,103,96,0.025)" />
          </g>
        ))}
      </svg>
    </motion.div>
  );
}

function FloatingHealthCard({
  className,
  eyebrow,
  value,
  text,
  chart,
}: {
  className: string;
  eyebrow: string;
  value: string;
  text: string;
  chart: number[];
}) {
  const points = chart
    .map((height, index) => `${index * (100 / (chart.length - 1))},${100 - height}`)
    .join(" ");

  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute w-[180px] rounded-[1.35rem] border border-[#10201f]/8 bg-white/78 p-4 shadow-[0_24px_80px_-58px_rgba(16,32,31,0.7)] backdrop-blur-2xl ${className}`}
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#78908d]">
        {eyebrow}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-sans text-3xl font-semibold leading-none">{value}</p>
          <p className="mt-2 text-xs font-medium text-[#536b68]">{text}</p>
        </div>
        <svg viewBox="0 0 100 100" className="h-12 w-20 shrink-0" aria-hidden="true">
          <polyline
            points={points}
            fill="none"
            stroke="#2f6760"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
          />
        </svg>
      </div>
    </motion.div>
  );
}

function CountUpCard({
  card,
  delay,
}: {
  card: { value: number; prefix?: string; suffix?: string; title: string; text: string };
  delay: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const totalFrames = 52;
    const timeout = window.setTimeout(() => {
      const tick = () => {
        frame += 1;
        const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
        setValue(Math.round(card.value * progress));
        if (frame < totalFrames) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    }, delay * 1000);
    return () => window.clearTimeout(timeout);
  }, [card.value, delay, inView]);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.62, ease: EASE, delay }}
      className="rounded-[1.75rem] border border-[#10201f]/8 bg-[#f7faf9] p-7 shadow-[0_24px_90px_-70px_rgba(16,32,31,0.58)]"
    >
      <p className="font-sans text-6xl font-semibold tracking-normal">
        {card.prefix}
        {value.toLocaleString("pt-BR")}
        {card.suffix}
      </p>
      <h3 className="mt-7 font-sans text-2xl font-semibold leading-tight">{card.title}</h3>
      <p className="mt-4 text-base leading-7 text-[#536b68]">{card.text}</p>
    </motion.article>
  );
}
