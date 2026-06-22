import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Privacidade — HTCare" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 py-5 text-[#10201f]">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <Link
          to="/perfil/$section"
          params={{ section: "privacidade-seguranca" }}
          className="grid h-11 w-11 place-items-center rounded-full border border-[#10201f]/8 bg-white shadow-soft"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Logo />
      </div>
      <section className="mx-auto mt-8 max-w-3xl rounded-[2rem] border border-[#10201f]/8 bg-white p-6 shadow-soft">
        <h1 className="font-sans text-3xl font-semibold">Política de privacidade</h1>
        <p className="mt-4 leading-7 text-[#536b68]">
          A HTCare coleta apenas os dados necessários para cadastro, acompanhamento do score,
          check-ins e preferências do app. As informações são vinculadas à sua conta e usadas para
          exibir sua evolução dentro da plataforma.
        </p>
        <p className="mt-4 leading-7 text-[#536b68]">
          Esta é uma versão inicial da política. Antes de uso público amplo, o texto deve ser
          revisado juridicamente para refletir todos os fluxos de produto, segurança e tratamento de
          dados.
        </p>
      </section>
    </main>
  );
}
