import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Stethoscope,
  Target,
  Timer,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import htcareLogo from "@/assets/brand/htcare-logo.png";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FluidParticlesBackground } from "@/components/ui/fluid-particles-background";

export const Route = createFileRoute("/para-profissionais")({
  head: () => ({
    meta: [
      { title: "Para profissionais de saúde — HTCare" },
      {
        name: "description",
        content:
          "A HTCare faz a triagem inicial de risco cardiovascular e metabólico do paciente e direciona quem tem risco identificado direto para você, sem mudar sua rotina.",
      },
    ],
  }),
  component: ParaProfissionais,
});

// TODO: substituir pelo link real de WhatsApp/Calendly do time HTCare.
const SCHEDULING_URL =
  "https://wa.me/5500000000?text=Quero%20agendar%20uma%20conversa%20sobre%20a%20HTCare";

const navItems = [
  { label: "O problema", href: "#problema" },
  { label: "Calculadora gratuita", href: "#calculadora" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "FAQ", href: "#faq" },
];

const problemPoints = [
  {
    icon: Clock,
    title: "Demorado",
    text: "Levantar histórico e calcular risco manualmente toma minutos preciosos de cada consulta.",
  },
  {
    icon: XCircle,
    title: "Inconsistente",
    text: "Sem um processo padronizado, fatores de risco importantes passam batido.",
  },
  {
    icon: Timer,
    title: "Ineficiente",
    text: "Pacientes chegam à consulta sem triagem prévia, e parte do tempo é gasto recolhendo informação básica em vez de discutir tratamento.",
  },
];

const whyItWorks = [
  {
    icon: Clock,
    title: "Economiza seu tempo",
    text: "O paciente chega à consulta já com triagem feita, histórico levantado e risco identificado.",
  },
  {
    icon: ShieldCheck,
    title: "Padroniza o critério",
    text: "Toda triagem segue o mesmo critério, baseado em diretrizes oficiais — não depende de quem atendeu naquele dia.",
  },
  {
    icon: Target,
    title: "Te dá uma base objetiva",
    text: "Você e o paciente partem do mesmo ponto: um resultado claro, não uma sensação.",
  },
];

const howItWorks = [
  {
    eyebrow: "Passo 1",
    title: "Triagem independente",
    text: "O paciente faz a triagem na HTCare, de forma independente (por conta própria ou indicado por você).",
  },
  {
    eyebrow: "Passo 2",
    title: "Risco identificado",
    text: "Se o risco for identificado como moderado ou alto, o sistema sugere buscar avaliação médica.",
  },
  {
    eyebrow: "Passo 3",
    title: "Histórico antes da consulta",
    text: "Você recebe o histórico e o resultado da triagem antes da consulta — direto pelo seu canal preferido (WhatsApp, e-mail).",
  },
  {
    eyebrow: "Passo 4",
    title: "Consulta com contexto",
    text: "A consulta já começa com contexto, sem precisar repetir perguntas básicas.",
  },
];

const faqs = [
  {
    question: "Preciso pagar algo para receber esses pacientes?",
    answer:
      "Não nesta fase inicial. Estamos validando o modelo com os primeiros parceiros sem custo nenhum.",
  },
  {
    question: "Isso muda minha forma de atender?",
    answer:
      "Não. Você continua atendendo do seu jeito. A única diferença é que o paciente chega com triagem e histórico já levantados.",
  },
  {
    question: "Quem faz a triagem, vocês ou eu?",
    answer:
      "A triagem é feita pela própria plataforma, de forma independente, antes do paciente chegar até você.",
  },
  {
    question: "E se o paciente não tiver risco nenhum identificado?",
    answer:
      "Não te enviamos esse paciente. Só direcionamos quem teve risco moderado ou alto identificado na triagem.",
  },
  {
    question: "Isso substitui exame ou diagnóstico?",
    answer:
      "Não. É uma ferramenta de triagem inicial, para te ajudar a priorizar quem precisa de atenção — a decisão clínica continua sendo sua.",
  },
  {
    question: "Como faço pra começar?",
    answer:
      "Agende uma conversa rápida com a gente. Em 15 minutos explicamos tudo e você decide se quer participar como um dos primeiros parceiros.",
  },
];

function ParaProfissionais() {
  return (
    <div className="min-h-screen bg-[#fbfcfc] text-[#10201f]">
      <header className="fixed left-0 right-0 top-0 z-50 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full border border-white/70 bg-white/72 px-4 py-2.5 shadow-[0_18px_60px_-42px_rgba(16,32,31,0.45)] backdrop-blur-2xl">
          <div className="flex min-w-0 items-center gap-7">
            <Link to="/">
              <img src={htcareLogo} alt="HTCare" className="h-10 w-auto shrink-0 object-contain" />
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-[#10201f]/68 md:flex">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap transition hover:text-[#10201f]"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <Button size="sm" className="rounded-full bg-[#10201f] font-semibold" asChild>
            <a href={SCHEDULING_URL} target="_blank" rel="noopener noreferrer">
              Agendar conversa
            </a>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative isolate -mt-20 overflow-hidden px-5 pb-20 pt-44 sm:px-8 sm:pb-28 sm:pt-52 lg:px-12">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(47,103,96,0.12),rgba(245,248,247,0.7)_55%,#fbfcfc_82%)]" />
          <FluidParticlesBackground
            className="absolute inset-0 z-0"
            particleCount={500}
            particleColor="47, 103, 96"
            trailColor="rgba(251, 252, 252, 0.1)"
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 mx-auto max-w-4xl text-center"
          >
            <p className="mb-6 inline-flex rounded-full border border-[#10201f]/10 bg-white/70 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#486461] shadow-soft backdrop-blur">
              Para profissionais de saúde
            </p>
            <h1 className="mx-auto max-w-3xl font-sans text-[clamp(2.4rem,5.4vw,4.2rem)] font-semibold leading-[1.05] tracking-normal text-[#10201f]">
              Triagem de risco cardiovascular pronta, antes do paciente chegar até você
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-[#536b68]">
              A HTCare faz a triagem inicial de risco cardiovascular e metabólico do paciente —
              baseada em diretrizes da OMS e da Sociedade Brasileira de Cardiologia — e direciona
              pacientes com risco identificado diretamente para você. Sem mudar sua rotina.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="xl" className="rounded-full bg-[#10201f] px-7 font-semibold" asChild>
                <a href={SCHEDULING_URL} target="_blank" rel="noopener noreferrer">
                  Agendar conversa de 15 minutos <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button
                size="xl"
                variant="outline"
                className="rounded-full border-[#10201f]/12 bg-white/60 px-7 font-semibold text-[#10201f] shadow-soft backdrop-blur hover:bg-white"
                onClick={() =>
                  toast.info("Em breve disponibilizamos um exemplo de relatório por aqui.")
                }
              >
                Ver um exemplo de relatório
              </Button>
            </div>
          </motion.div>
        </section>

        <section id="problema" className="bg-white px-6 py-20 text-[#10201f] sm:py-28">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                O problema
              </p>
              <h2 className="mt-4 font-sans text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                Triagem manual consome tempo que você não tem
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#536b68]">
                Levantar histórico, calcular risco e decidir prioridade de cada paciente manualmente
                consome tempo de consulta que poderia ser usado para a conversa clínica que
                realmente importa.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {problemPoints.map((point, index) => (
                <motion.article
                  key={point.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.07 }}
                  className="rounded-[1.75rem] border border-[#10201f]/8 bg-[#fff8e8] p-7"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#9a5b12] shadow-soft">
                    <point.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-7 font-sans text-xl font-semibold tracking-normal">
                    {point.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-[#624510]">{point.text}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f9f8] px-6 py-20 text-[#10201f] sm:py-28">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-[2rem] border border-[#10201f]/8 bg-white p-8 text-center shadow-soft sm:p-10"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                Prova social
              </p>
              <p className="mt-6 font-sans text-2xl font-medium leading-snug text-[#10201f] sm:text-3xl">
                "Estamos construindo a HTCare ao lado de cardiologistas reais, desde o primeiro
                paciente."
              </p>
            </motion.div>
          </div>
        </section>

        <section id="calculadora" className="bg-white px-6 py-20 text-[#10201f] sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                Ferramenta gratuita
              </p>
              <h2 className="mt-4 font-sans text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                Quer testar antes de decidir? Sem cadastro, sem compromisso.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#536b68]">
                Disponibilizamos uma calculadora de risco cardiovascular gratuita, baseada nas
                mesmas diretrizes usadas na nossa triagem completa. Use com qualquer paciente, agora
                mesmo.
              </p>
              <Button
                size="xl"
                className="mt-8 rounded-full bg-[#10201f] px-7 font-semibold"
                onClick={() =>
                  toast.info(
                    "Calculadora pública chegará em breve. Agende uma conversa pra ver uma demonstração.",
                  )
                }
              >
                Testar a calculadora <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
              className="rounded-[2rem] border border-[#10201f]/8 bg-[#f7f9f8] p-8 shadow-soft"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#2f6760] shadow-soft">
                <FileText className="h-6 w-6" />
              </span>
              <p className="mt-6 text-sm font-medium text-[#536b68]">Resultado de exemplo</p>
              <p className="mt-2 font-sans text-6xl font-semibold text-[#10201f]">62</p>
              <p className="mt-2 font-semibold text-[#9a5b12]">Risco moderado</p>
              <p className="mt-5 text-sm leading-6 text-[#536b68]">
                Mesma régua de classificação usada na triagem completa — pressão, colesterol,
                diabetes, tabagismo e histórico familiar.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="bg-[#10201f] px-6 py-20 text-white sm:py-28">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">
                Por que funciona
              </p>
              <h2 className="mt-4 font-sans text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                Por que isso faz sentido para sua rotina
              </h2>
            </motion.div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {whyItWorks.map((item, index) => (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.07 }}
                  className="rounded-[1.75rem] border border-white/12 bg-white/8 p-7"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#10201f]">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-7 font-sans text-xl font-semibold tracking-normal text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-white/70">{item.text}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-[#f7f9f8] px-6 py-20 text-[#10201f] sm:py-28">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                Como funciona na prática
              </p>
              <h2 className="mt-4 font-sans text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                Do questionário do paciente até a sua consulta
              </h2>
            </motion.div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-[#10201f]/8 bg-[#10201f]/8 md:grid-cols-4">
              {howItWorks.map((step, index) => (
                <motion.article
                  key={step.eyebrow}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.06 }}
                  className="bg-white p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]">
                    {step.eyebrow}
                  </p>
                  <h3 className="mt-4 font-sans text-lg font-semibold tracking-normal">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#536b68]">{step.text}</p>
                </motion.article>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mt-6 rounded-2xl border border-[#d89a1d]/25 bg-[#fff8e8] p-5 text-sm leading-6 text-[#624510]"
            >
              Ainda não temos integração automática de agenda nem envio automatizado de relatório —
              isso é feito manualmente por enquanto, enquanto validamos o modelo com os primeiros
              parceiros.
            </motion.div>
          </div>
        </section>

        <section className="bg-white px-6 py-20 text-[#10201f] sm:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f7f9f8] text-[#2f6760] shadow-soft">
                <Stethoscope className="h-6 w-6" />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                Base científica
              </p>
              <h2 className="mt-4 font-sans text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                Critérios reconhecidos, não fórmula proprietária
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#536b68]">
                Nosso cálculo de risco é baseado nos critérios da OMS (ferramenta HEARTS) e da
                Sociedade Brasileira de Cardiologia — não usamos fórmula proprietária inventada por
                nós.
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#78908d] italic">
                Conforme a HTCare evoluir, avaliamos alinhar com critérios internacionais
                adicionais, como os da ACC/AHA, caso isso agregue credibilidade para o público
                médico.
              </p>
            </motion.div>
          </div>
        </section>

        <section id="faq" className="bg-[#f7f9f8] px-6 py-20 text-[#10201f] sm:py-28">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-10"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#536b68]">
                FAQ
              </p>
              <h2 className="mt-4 font-sans text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                Perguntas frequentes
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
              className="rounded-[2rem] border border-[#10201f]/8 bg-white px-6 shadow-soft sm:px-8"
            >
              <Accordion type="single" collapsible>
                {faqs.map((faq) => (
                  <AccordionItem
                    key={faq.question}
                    value={faq.question}
                    className="border-[#10201f]/8"
                  >
                    <AccordionTrigger className="font-sans text-base font-semibold text-[#10201f] hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-base leading-7 text-[#536b68]">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        <section className="bg-[#10201f] px-6 py-20 text-white sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mx-auto max-w-2xl text-center"
          >
            <Calendar className="mx-auto h-8 w-8 text-white/70" />
            <h2 className="mt-6 font-sans text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
              Vamos conversar por 15 minutos?
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Sem compromisso. Em 15 minutos explicamos tudo e você decide se quer participar como
              um dos primeiros parceiros.
            </p>
            <Button
              size="xl"
              className="mt-8 rounded-full bg-white px-7 font-semibold text-[#10201f] hover:bg-white/90"
              asChild
            >
              <a href={SCHEDULING_URL} target="_blank" rel="noopener noreferrer">
                Agendar conversa de 15 minutos <CheckCircle2 className="h-4 w-4" />
              </a>
            </Button>
          </motion.div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
