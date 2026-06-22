import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  FlaskConical,
  HeartPulse,
  House,
  Map,
  Pill,
  Plus,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";

const items = [
  { label: "Início", to: "/painel", icon: House },
  { label: "Jornada", to: "/missoes", icon: Map },
  { label: "Abrir", to: "", icon: Plus, featured: true },
  { label: "Histórico", to: "/historico", icon: ChartNoAxesColumnIncreasing },
  { label: "Perfil", to: "/perfil", icon: UserRound },
];

export function MobileAppNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const hubItems = [
    {
      label: "Meu Risco",
      description: "Score, fatores e próximos passos",
      to: "/meu-risco",
      icon: HeartPulse,
      tone: "bg-[#e8f5ef] text-[#2f6760]",
    },
    {
      label: "Plano de Ação",
      description: "Missões e progresso da semana",
      to: "/plano-acao",
      icon: ClipboardCheck,
      tone: "bg-[#e9f4fb] text-[#2f8fc8]",
    },
    {
      label: "Exames",
      description: "PDFs, imagens e observações",
      to: "/exames",
      icon: FlaskConical,
      tone: "bg-[#f1ecff] text-[#6f55c8]",
    },
    {
      label: "Medicamentos",
      description: "Uso, dose e lembretes",
      to: "/medicamentos",
      icon: Pill,
      tone: "bg-[#fff7dc] text-[#9a5b12]",
    },
    {
      label: "Conquistas",
      description: "Badges da sua jornada",
      to: "/conquistas",
      icon: Trophy,
      tone: "bg-[#fff1e8] text-[#b45421]",
    },
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] bg-[#10201f]/24 backdrop-blur-sm sm:hidden">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 h-full w-full"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.7rem)] mx-auto max-w-md rounded-[2rem] border border-white/70 bg-white p-4 shadow-[0_28px_110px_-54px_rgba(16,32,31,0.74)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-sans text-xl font-semibold text-[#10201f]">Abrir área</p>
                <p className="mt-1 text-sm text-[#78908d]">Escolha o que quer acompanhar agora.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-[#f7faf9]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {hubItems.map((hubItem, index) => {
                const Icon = hubItem.icon;
                return (
                  <button
                    key={hubItem.to}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      void navigate({ to: hubItem.to });
                    }}
                    className={`rounded-[1.35rem] border border-[#10201f]/8 bg-[#f7faf9] p-3 text-left transition active:scale-[0.98] ${
                      index === 4 ? "col-span-2 mx-auto w-[calc(50%-0.375rem)]" : ""
                    }`}
                  >
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-full ${hubItem.tone}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="mt-3 block font-sans text-base font-semibold text-[#10201f]">
                      {hubItem.label}
                    </span>
                    <span className="mt-1 block text-xs leading-4 text-[#78908d]">
                      {hubItem.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#10201f]/8 bg-white/88 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-18px_70px_-48px_rgba(16,32,31,0.55)] backdrop-blur-2xl sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.35rem] bg-[#f7faf9]/80 p-1">
          {items.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to === "/painel" && location.pathname === "/relatorio");
            const Icon = item.icon;
            if (item.featured) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setOpen(true)}
                  className="relative -mt-5 flex min-h-16 flex-col items-center justify-center gap-1 rounded-[1.35rem] bg-[linear-gradient(135deg,#2f8fc8,#49c7ae)] text-[0.66rem] font-bold text-white shadow-[0_18px_45px_-22px_rgba(47,143,200,0.9)] transition active:scale-95"
                >
                  <span className="absolute inset-0 animate-pulse rounded-[1.35rem] bg-[#49c7ae]/35 blur-md" />
                  <Icon className="h-6 w-6" strokeWidth={3} />
                  <span className="relative">{item.label}</span>
                </button>
              );
            }
            const activeClass =
              item.to === "/missoes"
                ? "bg-[#2f8fc8] text-white shadow-[0_12px_34px_-22px_rgba(47,143,200,0.9)]"
                : "bg-[#10201f] text-white shadow-[0_12px_34px_-22px_rgba(16,32,31,0.85)]";
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.05rem] text-[0.64rem] font-semibold transition ${
                  active ? activeClass : "text-[#78908d] active:bg-white"
                }`}
              >
                <Icon
                  className="h-5 w-5"
                  fill={active ? "currentColor" : "none"}
                  strokeWidth={active ? 2.8 : 2.2}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
