import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, Clock3, FlaskConical, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/medico")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Painel médico — HTCare" }] }),
  component: MedicoPage,
});

type ExamRequestStatus =
  | "aguardando_autorizacao"
  | "autorizado"
  | "recusado"
  | "resultado_recebido"
  | "concluido";

interface ExamRequest {
  id: string;
  user_id: string;
  status: ExamRequestStatus;
  cidade: string;
  telefone_whatsapp: string;
  plano_saude: string | null;
  medico_id: string | null;
  observacao_medico: string | null;
  resultado_url: string | null;
  created_at: string;
}

interface MedicoProfile {
  id: string;
  nome: string;
  crm: string | null;
}

interface PatientProfile {
  id: string;
  nome: string | null;
  email: string | null;
  cidade: string | null;
  telefone: string | null;
}

interface LatestAssessment {
  score: number | null;
  categoria_risco: string | null;
  fatores_que_pesaram: string[] | null;
  created_at: string | null;
}

interface ExamRequestRow {
  request: ExamRequest;
  patient: PatientProfile | null;
  assessment: LatestAssessment | null;
}

interface DynamicQueryBuilder {
  eq: (column: string, value: string) => DynamicQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => DynamicQueryBuilder;
  limit: (count: number) => DynamicQueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
}

interface DynamicUpdateBuilder {
  eq: (column: string, value: string) => Promise<{ error: unknown }>;
}

interface DynamicSupabaseTable {
  select: (columns: string) => DynamicQueryBuilder;
  update: (values: Record<string, unknown>) => DynamicUpdateBuilder;
}

interface DynamicSupabaseClient {
  from: (table: string) => DynamicSupabaseTable;
}

const DEFAULT_LAB = {
  name: "Laboratório parceiro HTCare",
  address: "Endereço confirmado pelo WhatsApp após a autorização",
  phone: "Contato enviado pela equipe HTCare",
};

function MedicoPage() {
  const { user } = Route.useRouteContext();
  const [doctor, setDoctor] = useState<MedicoProfile | null>(null);
  const [rows, setRows] = useState<ExamRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const requestsQuery = dynamicSupabase
      .from("exam_requests")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: requestData, error: requestError } = await (requestsQuery as unknown as Promise<{
      data: unknown;
      error: unknown;
    }>);

    if (requestError) {
      console.error(requestError);
      toast.error("Não foi possível carregar as solicitações.");
      setLoading(false);
      return;
    }

    const requests = Array.isArray(requestData) ? requestData.filter(isExamRequest) : [];
    const detailedRows = await Promise.all(requests.map((request) => loadRequestDetails(request)));
    setRows(detailedRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function initialLoad() {
      setLoading(true);
      const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
      const { data: doctorData, error: doctorError } = await dynamicSupabase
        .from("medico_profiles")
        .select("id,nome,crm")
        .eq("id", user.id)
        .maybeSingle();

      if (doctorError) {
        console.error(doctorError);
        setLoading(false);
        return;
      }

      if (!isMedicoProfile(doctorData)) {
        setDoctor(null);
        setLoading(false);
        return;
      }

      setDoctor(doctorData);
      await loadRequests();
    }

    void initialLoad();
  }, [loadRequests, user.id]);

  async function loadRequestDetails(request: ExamRequest): Promise<ExamRequestRow> {
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const [{ data: patientData }, { data: assessmentData }] = await Promise.all([
      dynamicSupabase
        .from("profiles")
        .select("id,nome,email,cidade,telefone")
        .eq("id", request.user_id)
        .maybeSingle(),
      dynamicSupabase
        .from("assessments")
        .select("score,categoria_risco,fatores_que_pesaram,created_at")
        .eq("user_id", request.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      request,
      patient: isPatientProfile(patientData) ? patientData : null,
      assessment: isLatestAssessment(assessmentData) ? assessmentData : null,
    };
  }

  async function authorize(requestId: string) {
    if (!doctor) return;
    setSavingId(requestId);
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const { error } = await dynamicSupabase
      .from("exam_requests")
      .update({
        status: "autorizado",
        medico_id: doctor.id,
        laboratorio_nome: DEFAULT_LAB.name,
        laboratorio_endereco: DEFAULT_LAB.address,
        laboratorio_telefone: DEFAULT_LAB.phone,
        observacao_medico: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    setSavingId(null);

    if (error) {
      console.error(error);
      toast.error("Não foi possível autorizar o exame.");
      return;
    }

    toast.success("Exame autorizado. Avise o paciente pelo WhatsApp.");
    await loadRequests();
  }

  async function refuse(requestId: string) {
    if (!doctor) return;
    const note = notes[requestId]?.trim();
    if (!note) {
      toast.error("Escreva um recado curto para o paciente.");
      return;
    }

    setSavingId(requestId);
    const dynamicSupabase = supabase as unknown as DynamicSupabaseClient;
    const { error } = await dynamicSupabase
      .from("exam_requests")
      .update({
        status: "recusado",
        medico_id: doctor.id,
        observacao_medico: note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    setSavingId(null);

    if (error) {
      console.error(error);
      toast.error("Não foi possível registrar o recado.");
      return;
    }

    toast.success("Recado salvo. O contato com o paciente segue manual por enquanto.");
    await loadRequests();
  }

  const pendingRows = useMemo(
    () => rows.filter((row) => row.request.status === "aguardando_autorizacao"),
    [rows],
  );
  const otherRows = useMemo(
    () => rows.filter((row) => row.request.status !== "aguardando_autorizacao"),
    [rows],
  );

  return (
    <main className="min-h-screen bg-[#fbfcfc] px-4 pb-12 pt-4 text-[#10201f] sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link to="/painel">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <Logo />
        <div className="h-10 w-10" />
      </div>

      <section className="mx-auto mt-8 max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#78908d]">Painel médico</p>
        <h1 className="mt-3 font-sans text-4xl font-semibold tracking-normal sm:text-6xl">
          Solicitações de exame
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#536b68]">
          Fluxo semi-manual para autorizar exames de sangue dos primeiros pacientes HTCare.
        </p>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        {loading && <EmptyState text="Carregando solicitações..." />}

        {!loading && !doctor && (
          <EmptyState text="Seu usuário ainda não está cadastrado como médico parceiro em medico_profiles." />
        )}

        {!loading && doctor && (
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-soft">
              <p className="text-sm font-semibold text-[#536b68]">Logado como</p>
              <p className="mt-1 font-sans text-2xl font-semibold">{doctor.nome}</p>
              {doctor.crm && <p className="mt-1 text-sm text-[#78908d]">CRM {doctor.crm}</p>}
            </div>

            <div>
              <h2 className="font-sans text-2xl font-semibold">Pendentes ({pendingRows.length})</h2>
              <div className="mt-4 grid gap-4">
                {pendingRows.length ? (
                  pendingRows.map((row) => (
                    <RequestCard
                      key={row.request.id}
                      row={row}
                      note={notes[row.request.id] ?? ""}
                      saving={savingId === row.request.id}
                      onNoteChange={(note) =>
                        setNotes((current) => ({ ...current, [row.request.id]: note }))
                      }
                      onAuthorize={() => void authorize(row.request.id)}
                      onRefuse={() => void refuse(row.request.id)}
                    />
                  ))
                ) : (
                  <EmptyState text="Nenhuma solicitação aguardando autorização." />
                )}
              </div>
            </div>

            {otherRows.length > 0 && (
              <div>
                <h2 className="font-sans text-2xl font-semibold">Histórico recente</h2>
                <div className="mt-4 grid gap-4">
                  {otherRows.map((row) => (
                    <RequestCard
                      key={row.request.id}
                      row={row}
                      note={notes[row.request.id] ?? ""}
                      saving={savingId === row.request.id}
                      readonly
                      onNoteChange={(note) =>
                        setNotes((current) => ({ ...current, [row.request.id]: note }))
                      }
                      onAuthorize={() => void authorize(row.request.id)}
                      onRefuse={() => void refuse(row.request.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function RequestCard({
  row,
  note,
  saving,
  readonly = false,
  onNoteChange,
  onAuthorize,
  onRefuse,
}: {
  row: ExamRequestRow;
  note: string;
  saving: boolean;
  readonly?: boolean;
  onNoteChange: (note: string) => void;
  onAuthorize: () => void;
  onRefuse: () => void;
}) {
  const factors = row.assessment?.fatores_que_pesaram ?? [];
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-[#10201f]/8 bg-white p-5 shadow-soft"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StatusPill status={row.request.status} />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#78908d]">
              {new Date(row.request.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <h3 className="mt-3 font-sans text-2xl font-semibold">
            {row.patient?.nome ?? "Paciente sem nome"}
          </h3>
          <p className="mt-1 text-sm text-[#536b68]">
            {row.patient?.email ?? "E-mail não informado"}
          </p>
        </div>

        <div className="rounded-2xl bg-[#f7faf9] px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#78908d]">Score</p>
          <p className="mt-1 font-sans text-3xl font-semibold">{row.assessment?.score ?? "—"}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Info label="Cidade" value={row.request.cidade || row.patient?.cidade || "Não informada"} />
        <Info
          label="WhatsApp"
          value={row.request.telefone_whatsapp || row.patient?.telefone || "Não informado"}
        />
        <Info label="Plano de saúde" value={row.request.plano_saude ?? "Não informado"} />
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#78908d]">
          Fatores de risco
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {factors.length ? (
            factors.map((factor) => (
              <span
                key={factor}
                className="rounded-full bg-[#fff7dc] px-3 py-2 text-xs font-bold text-[#9a5b12]"
              >
                {factor}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-[#eef3f1] px-3 py-2 text-xs font-bold text-[#536b68]">
              Sem fatores salvos
            </span>
          )}
        </div>
      </div>

      {row.request.resultado_url && (
        <a
          href={row.request.resultado_url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex font-bold text-[#2f8fc8]"
        >
          Ver resultado enviado
        </a>
      )}

      {!readonly && (
        <div className="mt-5 space-y-3 rounded-[1.25rem] bg-[#f7faf9] p-3">
          <Textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Recado ao paciente se precisar de mais informações"
            className="min-h-24 rounded-2xl bg-white"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="min-h-12 flex-1 rounded-full bg-[#10201f]"
              disabled={saving}
              onClick={onAuthorize}
            >
              Autorizar exame
            </Button>
            <Button
              variant="outline"
              className="min-h-12 flex-1 rounded-full"
              disabled={saving}
              onClick={onRefuse}
            >
              Recusar / solicitar mais informações
            </Button>
          </div>
        </div>
      )}
    </motion.article>
  );
}

function StatusPill({ status }: { status: ExamRequestStatus }) {
  const map = {
    aguardando_autorizacao: {
      label: "Aguardando autorização",
      className: "bg-[#e9f4fb] text-[#2f8fc8]",
      icon: Clock3,
    },
    autorizado: {
      label: "Autorizado",
      className: "bg-[#e8f5ef] text-[#2f6760]",
      icon: CheckCircle2,
    },
    recusado: {
      label: "Pendente",
      className: "bg-[#fff7dc] text-[#9a5b12]",
      icon: ShieldAlert,
    },
    resultado_recebido: {
      label: "Resultado recebido",
      className: "bg-[#e8f5ef] text-[#2f6760]",
      icon: FlaskConical,
    },
    concluido: {
      label: "Concluído",
      className: "bg-[#eef3f1] text-[#536b68]",
      icon: CheckCircle2,
    },
  } satisfies Record<ExamRequestStatus, { label: string; className: string; icon: typeof Clock3 }>;
  const item = map[status];
  const Icon = item.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${item.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {item.label}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f7faf9] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#78908d]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-[#10201f]/8 bg-white p-6 text-sm leading-6 text-[#536b68] shadow-soft">
      {text}
    </div>
  );
}

function isExamRequest(data: unknown): data is ExamRequest {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<ExamRequest>;
  return typeof record.id === "string" && typeof record.user_id === "string";
}

function isMedicoProfile(data: unknown): data is MedicoProfile {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<MedicoProfile>;
  return typeof record.id === "string" && typeof record.nome === "string";
}

function isPatientProfile(data: unknown): data is PatientProfile {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<PatientProfile>;
  return typeof record.id === "string";
}

function isLatestAssessment(data: unknown): data is LatestAssessment {
  if (!data || typeof data !== "object") return false;
  const record = data as Partial<LatestAssessment>;
  return "score" in record;
}
