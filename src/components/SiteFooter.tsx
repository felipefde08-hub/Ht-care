import { Link } from "@tanstack/react-router";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

const productLinks = [
  { label: "Para pacientes", to: "/para-pacientes" },
  { label: "Para profissionais", to: "/para-profissionais" },
  { label: "Criar conta gratuita", to: "/auth" },
];

const sectionLinks = [
  { label: "Sobre", href: "/#sobre" },
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "FAQ", href: "/#faq" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[#10201f]/8 bg-[#fbfcfc] px-6 py-14 text-[#10201f] sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr_0.85fr_1fr]">
          <div>
            <Logo />
            <p className="mt-6 max-w-sm text-base leading-7 text-[#536b68]">
              Acompanhamento cardiovascular e metabólico com dados organizados, score de risco e
              evolução ao longo do tempo.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#10201f]/8 bg-white px-4 py-2 text-sm font-medium text-[#536b68] shadow-soft">
              <ShieldCheck className="h-4 w-4 text-[#2f6760]" />
              Baseado em diretrizes médicas
            </div>
          </div>

          <FooterColumn title="Produto">
            {productLinks.map((link) => (
              <Link key={link.to} to={link.to} className="transition hover:text-[#10201f]">
                {link.label}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title="Navegação">
            {sectionLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-[#10201f]">
                {link.label}
              </a>
            ))}
          </FooterColumn>

          <div className="rounded-[1.75rem] border border-[#10201f]/8 bg-white p-6 shadow-[0_24px_90px_-72px_rgba(16,32,31,0.54)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]">
              Contato
            </p>
            <h3 className="mt-4 font-sans text-2xl font-semibold leading-tight">
              Quer falar com a HTCare?
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#536b68]">
              Para parcerias, dúvidas ou contato com profissionais de saúde.
            </p>
            <a
              href="mailto:contato@htcare.com.br"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#10201f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f3b38]"
            >
              <Mail className="h-4 w-4" />
              contato@htcare.com.br
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-[#10201f]/8 pt-7 text-sm leading-6 text-[#78908d] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} HTCare. Todos os direitos reservados.</p>
          <p className="max-w-2xl">
            A HTCare é uma ferramenta de triagem e acompanhamento. Não substitui consulta,
            diagnóstico ou prescrição médica.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#78908d]">{title}</p>
      <div className="mt-5 grid gap-3 text-sm font-medium text-[#536b68]">{children}</div>
    </div>
  );
}
