import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FALLBACK_ADMIN_EMAILS = ["felipe.fde08@gmail.com", "felipefde08@gmail.com"];

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

interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  last_sign_in_at?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    nome?: string;
  };
}

interface ProfileRow {
  id: string;
  email?: string | null;
  nome?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  idade?: number | null;
  sexo?: string | null;
  created_at?: string | null;
}

interface AssessmentRow {
  user_id: string;
  score: number | null;
  categoria_risco: string | null;
  created_at: string | null;
}

interface CheckinRow {
  user_id: string;
  created_at: string | null;
}

interface ExamRequestRow {
  id: string;
  user_id: string;
  status: string | null;
  cidade?: string | null;
  telefone_whatsapp?: string | null;
  resultado_url?: string | null;
  laboratorio_nome?: string | null;
  created_at: string | null;
}

interface ExamResultRow {
  id: string;
  user_id: string;
  laboratorio_nome: string | null;
  arquivo_url: string | null;
  score_calculado: number | null;
  categoria_risco: string | null;
  created_at: string | null;
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const claims = context.claims as { email?: string } | undefined;
    const { data: authData } = await context.supabase.auth.getUser();
    const email = (authData.user?.email ?? claims?.email)?.toLowerCase();

    if (!email || !getAdminEmails().includes(email)) {
      throw new Error("Acesso negado.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { data: usersPage, error: usersError },
      profilesResult,
      assessmentsResult,
      checkinsResult,
      examRequestsResult,
      examResultsResult,
    ] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from("profiles").select("id,email,nome,telefone,cidade,idade,sexo,created_at"),
      supabaseAdmin
        .from("assessments")
        .select("user_id,score,categoria_risco,created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("checkins").select("user_id,created_at").order("created_at", {
        ascending: false,
      }),
      supabaseAdmin
        .from("exam_requests")
        .select(
          "id,user_id,status,cidade,telefone_whatsapp,resultado_url,laboratorio_nome,created_at",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("exam_results")
        .select(
          "id,user_id,laboratorio_nome,arquivo_url,score_calculado,categoria_risco,created_at",
        )
        .order("created_at", { ascending: false }),
    ]);

    if (usersError) throw new Error(usersError.message);
    if (profilesResult.error) throw new Error(profilesResult.error.message);
    if (assessmentsResult.error) throw new Error(assessmentsResult.error.message);
    if (checkinsResult.error) throw new Error(checkinsResult.error.message);
    if (examRequestsResult.error) throw new Error(examRequestsResult.error.message);
    if (examResultsResult.error) throw new Error(examResultsResult.error.message);

    const authUsers = (usersPage?.users ?? []) as AuthUser[];
    const profiles = (profilesResult.data ?? []) as ProfileRow[];
    const assessments = (assessmentsResult.data ?? []) as AssessmentRow[];
    const checkins = (checkinsResult.data ?? []) as CheckinRow[];
    const examRequests = (examRequestsResult.data ?? []) as ExamRequestRow[];
    const examResults = (examResultsResult.data ?? []) as ExamResultRow[];

    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    const assessmentsByUser = groupByUser(assessments);
    const checkinsByUser = groupByUser(checkins);
    const examRequestsByUser = groupByUser(examRequests);
    const examResultsByUser = groupByUser(examResults);
    const allIds = new Set([
      ...authUsers.map((user) => user.id),
      ...profiles.map((profile) => profile.id),
    ]);

    const users: AdminUserRow[] = [...allIds]
      .map((id) => {
        const authUser = authUsers.find((user) => user.id === id);
        const profile = profilesById.get(id);
        const userAssessments = assessmentsByUser.get(id) ?? [];
        const userCheckins = checkinsByUser.get(id) ?? [];
        const userExamRequests = examRequestsByUser.get(id) ?? [];
        const userExamResults = examResultsByUser.get(id) ?? [];
        const latestAssessment = userAssessments[0];
        const latestExamAt = [
          userExamRequests[0]?.created_at,
          userExamResults[0]?.created_at,
        ]
          .filter(Boolean)
          .sort((a, b) => +new Date(String(b)) - +new Date(String(a)))[0] as string | undefined;
        const name =
          profile?.nome ??
          authUser?.user_metadata?.name ??
          authUser?.user_metadata?.full_name ??
          authUser?.user_metadata?.nome ??
          null;

        return {
          id,
          email: authUser?.email ?? profile?.email ?? "Sem e-mail",
          name,
          phone: profile?.telefone ?? authUser?.phone ?? null,
          city: profile?.cidade ?? null,
          age: profile?.idade ?? null,
          sex: profile?.sexo ?? null,
          createdAt: authUser?.created_at ?? profile?.created_at ?? null,
          lastLoginAt: authUser?.last_sign_in_at ?? null,
          answeredOnboarding: userAssessments.length > 0,
          assessmentsCount: userAssessments.length,
          checkinsCount: userCheckins.length,
          latestScore: latestAssessment?.score ?? null,
          latestRisk: latestAssessment?.categoria_risco ?? null,
          latestAssessmentAt: latestAssessment?.created_at ?? null,
          examRequestsCount: userExamRequests.length,
          examResultsCount: userExamResults.length,
          latestExamAt: latestExamAt ?? null,
        };
      })
      .sort((a, b) => {
        const left = a.lastLoginAt ?? a.createdAt ?? "";
        const right = b.lastLoginAt ?? b.createdAt ?? "";
        return +new Date(right) - +new Date(left);
      });

    const userDirectory = new Map(users.map((user) => [user.id, user]));
    const exams: AdminExamRow[] = [
      ...examResults.map((exam) =>
        buildExamAdminRow({
          id: exam.id,
          type: "Resultado interpretado",
          userId: exam.user_id,
          user: userDirectory.get(exam.user_id),
          status: "interpretado",
          score: exam.score_calculado,
          risk: exam.categoria_risco,
          laboratory: exam.laboratorio_nome,
          fileUrl: exam.arquivo_url,
          createdAt: exam.created_at,
        }),
      ),
      ...examRequests.map((request) =>
        buildExamAdminRow({
          id: request.id,
          type: "Solicitação",
          userId: request.user_id,
          user: userDirectory.get(request.user_id),
          status: request.status,
          score: null,
          risk: null,
          laboratory: request.laboratorio_nome ?? null,
          fileUrl: request.resultado_url ?? null,
          createdAt: request.created_at,
          fallbackPhone: request.telefone_whatsapp ?? null,
          fallbackCity: request.cidade ?? null,
        }),
      ),
    ].sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0));

    const sevenDaysAgo = Date.now() - 7 * 86_400_000;

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        users: users.length,
        profiles: profiles.length,
        answered: users.filter((user) => user.answeredOnboarding).length,
        loggedInLast7Days: users.filter(
          (user) => user.lastLoginAt && new Date(user.lastLoginAt).getTime() >= sevenDaysAgo,
        ).length,
        assessments: assessments.length,
        checkins: checkins.length,
        examRequests: examRequests.length,
        examResults: examResults.length,
        examUploads: 0,
      },
      users,
      exams,
    };
  });

function buildExamAdminRow(input: {
  id: string;
  type: AdminExamRow["type"];
  userId: string;
  user?: AdminUserRow;
  status: string | null;
  score: number | null;
  risk: string | null;
  laboratory: string | null;
  fileUrl: string | null;
  createdAt: string | null;
  fallbackName?: string | null;
  fallbackPhone?: string | null;
  fallbackCity?: string | null;
}): AdminExamRow {
  return {
    id: input.id,
    type: input.type,
    userId: input.userId,
    email: input.user?.email ?? "Sem e-mail",
    name: input.user?.name ?? input.fallbackName ?? null,
    phone: input.user?.phone ?? input.fallbackPhone ?? null,
    city: input.user?.city ?? input.fallbackCity ?? null,
    status: input.status,
    score: input.score,
    risk: input.risk,
    laboratory: input.laboratory,
    fileUrl: input.fileUrl,
    createdAt: input.createdAt,
  };
}

function getAdminEmails() {
  const raw = process.env.HTCARE_ADMIN_EMAILS || process.env.VITE_HTCARE_ADMIN_EMAILS || "";
  const configured = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...FALLBACK_ADMIN_EMAILS, ...configured])];
}

function groupByUser<T extends { user_id: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const current = grouped.get(row.user_id) ?? [];
    current.push(row);
    grouped.set(row.user_id, current);
  }
  return grouped;
}
