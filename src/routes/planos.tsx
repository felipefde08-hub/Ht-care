import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Bell, Check, ChevronLeft, HeartPulse, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { MobileAppNav } from "@/components/MobileAppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/planos")({
  ssr: false,
  head: () => ({ meta: [{ title: "Planos — HTCare" }] }),
  component: PlansPage,
});

const plans = [
  {
    name: "Free",
    price: "Grátis",
    description: "Para começar a entender seu risco e acompanhar o básico.",
    icon: HeartPulse,
    available: true,
    tone: "from-[#e9f4fb] to-[#e8f5ef]",
    features: [
      ["Score + Relatório", true],
      ["Carelito IA", false],
      ["Histórico completo", false],
      ["PDF para médico", false],
      ["Upload de exames", false],
      ["Múltiplos perfis", false],
    ],
  },
  {
    name: "Plus",
    price: "R$19,90/mês",
    description: "Mais acompanhamento, histórico e recursos inteligentes.",
    icon: Sparkles,
    available: false,
    tone: "from-[#e9f4fb] to-[#f1ecff]",
    features: [
      ["Score + Relatório", true],
      ["Carelito IA", true],
      ["Histórico completo", true],
      ["PDF para médico", true],
      ["Upload de exames", true],
      ["Múltiplos perfis", false],
    ],
  },
  {
    name: "Família",
    price: "R$34,90/mês",
    description: "Acompanhe até 4 pessoas com uma visão familiar.",
    icon: Users,
    available: false,
    tone: "from-[#e8f5ef] to-[#fff7dc]",
    features: [
      ["Score + Relatório", true],
      ["Carelito IA", true],
      ["Histórico completo", true],
      ["PDF para médico", true],
      ["Upload de exames", true],
      ["Múltiplos perfis", true],
    ],
  },
];

function PlansPage() {
  const [email, setEmail] = useState("");

  function notifyInterest(planName: string) {
    const normalized = email.trim();
    if (!normalized || !normalized.includes("@")) {
      toast.error("Informe um e-mail válido para receber o aviso.");
      return;
    }
    const existing = JSON.parse(
      window.localStorage.getItem("htcare:plan-interest") || "[]",
    ) as Array<{ email: string; plan: string; createdAt: string }>;
    window.localStorage.setItem(
      "htcare:plan-interest",
      JSON.stringify([
        ...existing,
        { email: normalized, plan: planName, createdAt: new Date().toISOString() },
      ]),
    );
    toast.success("Pronto. Vamos te avisar quando esse plano estiver disponível.");
    setEmail("");
  }

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-28 pt-4 text-[#10201f] sm:px-5 sm:pb-10 sm:pt-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <Button variant="ghost" className="rounded-full" asChild>
          <Link to="/perfil">
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </header>

      <section className="mx-auto mt-8 max-w-6xl sm:mt-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#78908d]">
            Planos HTCare
          </p>
          <h1 className="mt-3 font-sans text-4xl font-semibold leading-tight sm:text-7xl">
            Escolha como quer acompanhar seu coração.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#536b68] sm:text-base sm:leading-7">
            O plano gratuito continua disponível. Plus e Família entram em breve, com recursos
            extras para acompanhamento, exames e relatórios.
          </p>
        </motion.div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.article
                key={plan.name}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.06 * index }}
                className={`rounded-[2rem] border border-[#10201f]/8 bg-gradient-to-br ${plan.tone} p-5 shadow-soft sm:p-6`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white/78 text-[#2f6760] shadow-soft">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      plan.available ? "bg-[#10201f] text-white" : "bg-white/78 text-[#536b68]"
                    }`}
                  >
                    {plan.available ? "Atual" : "Em breve"}
                  </span>
                </div>
                <h2 className="mt-5 font-sans text-2xl font-semibold">{plan.name}</h2>
                <p className="mt-2 font-sans text-3xl font-semibold">{plan.price}</p>
                <p className="mt-3 min-h-12 text-sm leading-6 text-[#536b68]">{plan.description}</p>
                <div className="mt-5 space-y-2">
                  {plan.features.map(([feature, enabled]) => (
                    <div
                      key={feature}
                      className={`flex items-center gap-2 rounded-2xl bg-white/62 px-3 py-2 text-sm font-semibold ${
                        enabled ? "text-[#10201f]" : "text-[#9aa8a5]"
                      }`}
                    >
                      <Check className={`h-4 w-4 ${enabled ? "text-[#2f6760]" : "opacity-20"}`} />
                      {feature}
                    </div>
                  ))}
                </div>
                {plan.available ? (
                  <Button className="mt-5 w-full rounded-full bg-[#10201f]" asChild>
                    <Link to="/painel">Continuar no Free</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 w-full rounded-full border-white/80 bg-white/72"
                    onClick={() => notifyInterest(plan.name)}
                  >
                    <Bell className="h-4 w-4" />
                    Avise-me
                  </Button>
                )}
              </motion.article>
            );
          })}
        </div>

        <section className="mt-5 rounded-[1.7rem] border border-[#10201f]/8 bg-white p-4 shadow-soft sm:mt-8 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <h2 className="font-sans text-xl font-semibold">Receba o aviso de lançamento</h2>
              <p className="mt-1 text-sm leading-6 text-[#536b68]">
                Deixe seu melhor e-mail para avisarmos quando Plus e Família estiverem disponíveis.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                className="h-12 min-w-0 rounded-full sm:w-72"
              />
              <Button
                type="button"
                className="h-12 rounded-full bg-[#10201f]"
                onClick={() => notifyInterest("geral")}
              >
                Enviar
              </Button>
            </div>
          </div>
        </section>
      </section>
      <MobileAppNav />
    </main>
  );
}
