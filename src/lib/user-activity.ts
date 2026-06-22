import { supabase } from "@/integrations/supabase/client";
import { HEART_POINTS } from "@/lib/points";

export type UserActivityAction =
  | "app_open"
  | "login"
  | "onboarding"
  | "checkin"
  | "mission"
  | "data_update";

type StoredActivityDays = Record<string, UserActivityAction[]>;
export interface UserActivityEvent {
  id: string;
  type: UserActivityAction;
  title: string;
  points: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export async function recordUserActivity(
  userId: string,
  action: UserActivityAction,
  metadata: Record<string, unknown> = {},
) {
  const date = getLocalDateKey(new Date());
  const stored = readStoredActivityDays(userId);
  const actions = Array.from(new Set([...(stored[date] ?? []), action]));
  const next = { ...stored, [date]: actions };
  saveStoredActivityDays(userId, next);
  const event = buildActivityEvent(action, metadata);
  if (event.points > 0) saveStoredActivityEvent(userId, event);

  const { error } = await supabase.from("user_activity_days").upsert(
    {
      user_id: userId,
      activity_date: date,
      actions,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,activity_date" },
  );

  if (error) {
    console.warn("Não foi possível sincronizar atividade diária no Supabase.", error);
  }

  if (event.points <= 0) return;

  const { error: eventError } = await supabase.from("user_activity_events").insert({
    user_id: userId,
    event_type: event.type,
    title: event.title,
    points: event.points,
    metadata: event.metadata ?? {},
    created_at: event.createdAt,
  });

  if (eventError) {
    console.warn("Não foi possível sincronizar evento de atividade no Supabase.", eventError);
  }
}

export async function getActiveDaysThisMonth(userId: string) {
  const localDays = new Set(
    Object.keys(readStoredActivityDays(userId)).filter((date) => date.startsWith(getMonthPrefix())),
  );
  const { start, end } = getCurrentMonthRange();

  const { data, error } = await supabase
    .from("user_activity_days")
    .select("activity_date")
    .gte("activity_date", start)
    .lte("activity_date", end);

  if (error) {
    console.warn("Não foi possível buscar dias ativos no Supabase.", error);
    return localDays.size;
  }

  for (const item of data ?? []) {
    localDays.add(item.activity_date);
  }

  return localDays.size;
}

export async function getUserActivityEvents(userId: string, limit = 30) {
  const localEvents = readStoredActivityEvents(userId);
  const { data, error } = await supabase
    .from("user_activity_events")
    .select("id,event_type,title,points,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("Não foi possível buscar eventos de atividade no Supabase.", error);
    return localEvents.slice(0, limit);
  }

  const remoteEvents = (data ?? []).map((item) => ({
    id: item.id,
    type: item.event_type as UserActivityAction,
    title: item.title,
    points: item.points,
    createdAt: item.created_at,
    metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : {},
  }));

  const merged = [...remoteEvents, ...localEvents].filter(
    (event, index, list) => list.findIndex((item) => item.id === event.id) === index,
  );

  return merged.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit);
}

export function getStoredNonMissionPointTotal() {
  if (typeof window === "undefined") return 0;
  try {
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith("htcare:activity-events:"),
    );
    return keys.reduce((total, key) => {
      const events = JSON.parse(window.localStorage.getItem(key) || "[]") as UserActivityEvent[];
      return (
        total +
        events
          .filter((event) => event.type !== "mission")
          .reduce((subtotal, event) => subtotal + event.points, 0)
      );
    }, 0);
  } catch {
    return 0;
  }
}

function readStoredActivityDays(userId: string): StoredActivityDays {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as StoredActivityDays) : {};
  } catch {
    return {};
  }
}

function saveStoredActivityDays(userId: string, days: StoredActivityDays) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(days));
}

function readStoredActivityEvents(userId: string): UserActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(eventStorageKey(userId));
    return raw ? (JSON.parse(raw) as UserActivityEvent[]) : [];
  } catch {
    return [];
  }
}

function saveStoredActivityEvent(userId: string, event: UserActivityEvent) {
  const events = readStoredActivityEvents(userId);
  const exists = events.some((item) => item.id === event.id);
  const next = exists ? events : [event, ...events].slice(0, 100);
  window.localStorage.setItem(eventStorageKey(userId), JSON.stringify(next));
}

function buildActivityEvent(
  action: UserActivityAction,
  metadata: Record<string, unknown>,
): UserActivityEvent {
  const createdAt = new Date().toISOString();
  const title = {
    app_open: "App aberto",
    login: "Login realizado",
    onboarding: "Questionário inicial concluído",
    checkin: "Check-in completo",
    mission: String(metadata.title ?? "Missão semanal concluída"),
    data_update: "Dado de saúde atualizado",
  }[action];
  const points = {
    app_open: 0,
    login: 0,
    onboarding: HEART_POINTS.onboarding,
    checkin: HEART_POINTS.checkin,
    mission: HEART_POINTS.mission,
    data_update: HEART_POINTS.dataUpdate,
  }[action];
  const id =
    action === "mission" && metadata.missionId
      ? `mission:${metadata.weekKey ?? getLocalDateKey(new Date())}:${metadata.missionId}`
      : `${action}:${createdAt}`;
  return { id, type: action, title, points, createdAt, metadata };
}

function storageKey(userId: string) {
  return `htcare:activity-days:${userId}`;
}

function eventStorageKey(userId: string) {
  return `htcare:activity-events:${userId}`;
}

function getMonthPrefix() {
  return getLocalDateKey(new Date()).slice(0, 7);
}

function getCurrentMonthRange() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: getLocalDateKey(startDate),
    end: getLocalDateKey(endDate),
  };
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
