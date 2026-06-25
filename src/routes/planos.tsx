import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, ChevronLeft, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/planos")({
  ssr: false,
  head: () => ({ meta: [{ title: "Planos — HTCare" }] }),
  component: PlansPage,
});

const plans = [
  {
    name: "Gratuito",
    price: "R$0",
    detail: "Score inicial e registros básicos.",
    selected: false,
  },
  {
    name: "Plus",
    price: "R$19,90/mês",
    detail: "Protocolo, relatórios e acompanhamento completo.",
    selected: true,
    badge: "Mais popular",
  },
  {
    name: "Família",
    price: "R$34,90/mês",
    detail: "Até 4 perfis acompanhando juntos.",
    selected: false,
  },
];

function PlansPage() {
  const [selected, setSelected] = useState("Plus");

  function continuePlan() {
    toast.success(`${selected} selecionado. Pagamento entra em breve.`);
  }

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <section className="relative min-h-[44vh] overflow-hidden px-4 pb-20 pt-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.36),transparent_42%)]" />
        <header className="relative z-10 mx-auto flex max-w-md items-center justify-between">
          <Link
            to="/perfil"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Logo />
          <div className="h-10 w-10" />
        </header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative z-10 mx-auto mt-12 max-w-md"
        >
          <div className="flex gap-1 text-[#FACC15]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-5 w-5 fill-current" />
            ))}
          </div>
          <blockquote className="mt-5 text-[28px] font-bold leading-tight tracking-[-0.02em]">
            “Finalmente entendi meus exames sem me perder em números.”
          </blockquote>
          <p className="mt-4 text-sm leading-6 text-white/68">
            João, 48 anos · acompanhando pressão, ApoB e resistência à insulina com a HTCare.
          </p>
        </motion.div>
      </section>

      <section className="-mt-10 min-h-[62vh] rounded-t-[2rem] bg-white px-4 pb-9 pt-5 text-[#111827] shadow-[0_-20px_70px_-44px_rgba(0,0,0,0.6)]">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
          <h1 className="text-[22px] font-bold">Escolha seu plano</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            Comece grátis. Evolua quando quiser para relatórios e protocolos completos.
          </p>

          <div className="mt-5 space-y-3">
            {plans.map((plan) => {
              const active = selected === plan.name;
              return (
                <button
                  key={plan.name}
                  type="button"
                  onClick={() => setSelected(plan.name)}
                  className={`w-full rounded-2xl border bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition ${
                    active ? "border-[#2563EB] ring-2 ring-[#2563EB]/12" : "border-[#E5E7EB]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold">{plan.name}</h2>
                        {plan.badge && (
                          <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[#6B7280]">{plan.detail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold">{plan.price}</p>
                      <span
                        className={`mt-2 inline-grid h-6 w-6 place-items-center rounded-full border ${
                          active ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#D1D5DB]"
                        }`}
                      >
                        {active && <Check className="h-4 w-4" />}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            className="mt-5 min-h-12 w-full rounded-xl bg-[#2563EB] text-base font-semibold"
            onClick={continuePlan}
          >
            Continuar
          </Button>
          <Link
            to="/perfil"
            className="mx-auto mt-4 block w-fit text-sm font-semibold text-[#6B7280]"
          >
            Voltar
          </Link>
        </div>
      </section>
    </main>
  );
}
