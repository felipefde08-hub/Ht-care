import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  FlaskConical,
  LogIn,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAdminOverview } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/htcare-admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Admin oculto — HTCare" }] }),
  component: HiddenAdminPage,
});

interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  age: number | null;
  sex: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  answeredOnboarding: boolean;
  assessmentsCount: number;
  checkinsCount: number;
  latestScore: number | null;
  latestRisk: string | null;
  latestAssessmentAt: string | null;
  examRequestsCount: number;
  examResultsCount: number;
  latestExamAt: string | null;
}

interface AdminExamRow {
  id: string;
  type: "Solicitação" | "Resultado interpretado" | "Upload avulso";
  userId: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  status: string | null;
  score: number | null;
  risk: string | null;
  laboratory: string | null;
  fileUrl: string | null;
  createdAt: string | null;
}

interface AdminOverview {
  generatedAt: string;
  totals: {
    users: number;
    profiles: number;
    answered: number;
    loggedInLast7Days: number;
    assessments: number;
    checkins: number;
    examRequests: number;
    examResults: number;
    examUploads: number;
  };
  users: AdminUserRow[];
  exams: AdminExamRow[];
}

function HiddenAdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminOverview();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const users = overview?.users ?? [];
    if (!normalized) return users;
    return users.filter((user) =>
      [user.email, user.name, user.phone, user.city].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(normalized),
      ),
    );
  }, [overview?.users, query]);

  return (
    <main className="min-h-screen bg-[#F9FAFB] px-4 py-5 text-[#111827] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-auto" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                Admin oculto
              </p>
              <h1 className="text-2xl font-bold tracking-tight">Entradas, logins e respostas</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to="/painel">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button className="rounded-xl bg-[#2563EB]" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </header>

        {error && (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
            <p className="mt-2 font-normal">
              Se aparecer erro de variável, configure `SUPABASE_SERVICE_ROLE_KEY` na Vercel.
            </p>
          </section>
        )}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <MetricCard
            icon={<UserRound className="h-5 w-5" />}
            label="Usuários"
            value={overview?.totals.users ?? 0}
          />
          <MetricCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Responderam"
            value={overview?.totals.answered ?? 0}
          />
          <MetricCard
            icon={<LogIn className="h-5 w-5" />}
            label="Login 7 dias"
            value={overview?.totals.loggedInLast7Days ?? 0}
          />
          <MetricCard
            icon={<Activity className="h-5 w-5" />}
            label="Scores"
            value={overview?.totals.assessments ?? 0}
          />
          <MetricCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Check-ins"
            value={overview?.totals.checkins ?? 0}
          />
          <MetricCard
            icon={<UserRound className="h-5 w-5" />}
            label="Perfis"
            value={overview?.totals.profiles ?? 0}
          />
          <MetricCard
            icon={<FlaskConical className="h-5 w-5" />}
            label="Exames lidos"
            value={overview?.totals.examResults ?? 0}
          />
          <MetricCard
            icon={<FileText className="h-5 w-5" />}
            label="Solicitações"
            value={overview?.totals.examRequests ?? 0}
          />
        </section>

        <section className="mt-6 rounded-3xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Exames enviados e interpretados</h2>
              <p className="text-sm text-[#6B7280]">
                {loading ? "Carregando..." : `${overview?.exams.length ?? 0} atividades de exame`}
              </p>
            </div>
            <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-bold text-[#2563EB]">
              Leitura + upload + solicitação
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.12em] text-[#6B7280]">
                  <th className="border-b border-[#E5E7EB] py-3 pr-4">Pessoa</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Tipo</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Status</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Score</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Laboratório</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Arquivo</th>
                  <th className="border-b border-[#E5E7EB] py-3 pl-4">Data</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.exams ?? []).map((exam) => (
                  <tr key={`${exam.type}-${exam.id}`} className="align-top">
                    <td className="border-b border-[#F3F4F6] py-4 pr-4">
                      <p className="font-bold text-[#111827]">{exam.name ?? "Sem nome"}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{exam.email}</p>
                      <p className="mt-1 text-xs text-[#9CA3AF]">
                        {[exam.phone, exam.city].filter(Boolean).join(" · ") || "Sem contato"}
                      </p>
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">
                      <ExamTypePill type={exam.type} />
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">
                      {formatExamStatus(exam.status)}
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">
                      <p className="font-bold">{exam.score ?? "—"}</p>
                      <p className="text-xs text-[#6B7280]">{formatRisk(exam.risk)}</p>
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">
                      {exam.laboratory ?? "—"}
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">
                      {exam.fileUrl ? (
                        <a
                          href={exam.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-bold text-[#2563EB]"
                        >
                          Abrir <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-b border-[#F3F4F6] py-4 pl-4">
                      {formatDateTime(exam.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && !(overview?.exams.length ?? 0) && (
            <div className="py-12 text-center text-sm text-[#6B7280]">
              Nenhum exame enviado ou interpretado ainda.
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Pessoas</h2>
              <p className="text-sm text-[#6B7280]">
                {loading
                  ? "Carregando..."
                  : `${filteredUsers.length} de ${overview?.users.length ?? 0} registros`}
              </p>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, e-mail, telefone ou cidade"
              className="min-h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm outline-none focus:border-[#2563EB] sm:w-80"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1020px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.12em] text-[#6B7280]">
                  <th className="border-b border-[#E5E7EB] py-3 pr-4">Pessoa</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Login</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Respondeu</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Score</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Check-ins</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Exames</th>
                  <th className="border-b border-[#E5E7EB] px-4 py-3">Contato</th>
                  <th className="border-b border-[#E5E7EB] py-3 pl-4">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="align-top">
                    <td className="border-b border-[#F3F4F6] py-4 pr-4">
                      <p className="font-bold text-[#111827]">{user.name ?? "Sem nome"}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{user.email}</p>
                      <p className="mt-1 text-xs text-[#9CA3AF]">
                        {formatProfileMeta(user.age, user.sex, user.city)}
                      </p>
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">
                      {formatDateTime(user.lastLoginAt)}
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">
                      <StatusPill active={user.answeredOnboarding}>
                        {user.answeredOnboarding
                          ? `${user.assessmentsCount} resposta(s)`
                          : "Pendente"}
                      </StatusPill>
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">
                      <p className="font-bold">{user.latestScore ?? "—"}</p>
                      <p className="text-xs text-[#6B7280]">
                        {formatRisk(user.latestRisk)} · {formatDate(user.latestAssessmentAt)}
                      </p>
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">{user.checkinsCount}</td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">
                      <p className="font-bold">
                        {user.examResultsCount} lido(s) · {user.examRequestsCount} solic.
                      </p>
                      <p className="text-xs text-[#6B7280]">{formatDate(user.latestExamAt)}</p>
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-4">
                      <p>{user.phone ?? "—"}</p>
                      <p className="text-xs text-[#6B7280]">{user.city ?? ""}</p>
                    </td>
                    <td className="border-b border-[#F3F4F6] py-4 pl-4">
                      {formatDateTime(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && !filteredUsers.length && (
            <div className="py-12 text-center text-sm text-[#6B7280]">
              Nenhuma pessoa encontrada.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        {icon}
      </span>
      <p className="mt-4 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#6B7280]">{label}</p>
    </div>
  );
}

function StatusPill({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        active ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]"
      }`}
    >
      {children}
    </span>
  );
}

function ExamTypePill({ type }: { type: AdminExamRow["type"] }) {
  const className =
    type === "Resultado interpretado"
      ? "bg-[#DCFCE7] text-[#166534]"
      : type === "Solicitação"
        ? "bg-[#EFF6FF] text-[#2563EB]"
        : "bg-[#F3F4F6] text-[#374151]";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>{type}</span>;
}

function formatProfileMeta(age: number | null, sex: string | null, city: string | null) {
  return [age ? `${age} anos` : null, sex, city].filter(Boolean).join(" · ") || "Perfil incompleto";
}

function formatRisk(value: string | null) {
  if (!value) return "Sem risco";
  if (value === "baixo") return "Baixo";
  if (value === "moderado") return "Moderado";
  if (value === "alto") return "Alto";
  return value;
}

function formatExamStatus(value: string | null) {
  if (!value) return "—";
  const labels: Record<string, string> = {
    aguardando_autorizacao: "Aguardando autorização",
    autorizado: "Autorizado",
    recusado: "Recusado",
    resultado_recebido: "Resultado recebido",
    concluido: "Concluído",
    interpretado: "Interpretado",
  };
  return labels[value] ?? value;
}

function formatDate(value: string | null) {
  if (!value) return "sem data";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
