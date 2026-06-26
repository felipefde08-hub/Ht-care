import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FALLBACK_ADMIN_EMAILS = ["felipe.fde08@gmail.com"];

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
  };
  users: AdminUserRow[];
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
    ]);

    if (usersError) throw new Error(usersError.message);
    if (profilesResult.error) throw new Error(profilesResult.error.message);
    if (assessmentsResult.error) throw new Error(assessmentsResult.error.message);
    if (checkinsResult.error) throw new Error(checkinsResult.error.message);

    const authUsers = (usersPage?.users ?? []) as AuthUser[];
    const profiles = (profilesResult.data ?? []) as ProfileRow[];
    const assessments = (assessmentsResult.data ?? []) as AssessmentRow[];
    const checkins = (checkinsResult.data ?? []) as CheckinRow[];

    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    const assessmentsByUser = groupByUser(assessments);
    const checkinsByUser = groupByUser(checkins);
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
        const latestAssessment = userAssessments[0];
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
        };
      })
      .sort((a, b) => {
        const left = a.lastLoginAt ?? a.createdAt ?? "";
        const right = b.lastLoginAt ?? b.createdAt ?? "";
        return +new Date(right) - +new Date(left);
      });

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
      },
      users,
    };
  });

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
