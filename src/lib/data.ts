import { supabase } from "@/integrations/supabase/client";
import type { CardiovascularInput, CardiovascularScores } from "@/lib/cardiovascular";
import { computeCardiovascularScores } from "@/lib/cardiovascular";

export interface Patient {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  sex: string | null;
  phone: string | null;
  guardian: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardioLog extends CardiovascularScores {
  id: string;
  patient_id: string;
  user_id: string;
  systolic: number;
  diastolic: number;
  heart_rate: number;
  medication_adherence: number;
  activity: number;
  weight: number | null;
  symptoms: number;
  exams_pending: number;
  smoking: boolean;
  diabetes: boolean;
  cholesterol: boolean;
  hypertension: boolean;
  family_history: boolean;
  clinical_notes: string | null;
  created_at: string;
}

export interface Professional {
  id: string;
  clinic_id?: string | null;
  name: string | null;
  email: string;
  role: "admin" | "professional";
  status: "active" | "invited";
  created_at: string;
}

export interface Profile {
  id: string;
  clinic_name: string;
  professional_name: string;
  email: string;
}

export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Patient[];
}

export async function fetchPatient(id: string): Promise<Patient | null> {
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Patient | null;
}

export async function fetchCardioLogs(): Promise<CardioLog[]> {
  const { data, error } = await supabase
    .from("cardio_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CardioLog[];
}

export async function fetchPatientCardioLogs(patientId: string): Promise<CardioLog[]> {
  const { data, error } = await supabase
    .from("cardio_logs")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CardioLog[];
}

export async function createCardioLog(patientId: string, input: CardiovascularInput) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sessão expirada");

  const scores = computeCardiovascularScores(input);
  const { data, error } = await supabase
    .from("cardio_logs")
    .insert({
      patient_id: patientId,
      user_id: userData.user.id,
      systolic: input.systolic,
      diastolic: input.diastolic,
      heart_rate: input.heartRate,
      medication_adherence: input.medicationAdherence,
      activity: input.activity,
      weight: input.weight ?? null,
      symptoms: input.symptoms,
      exams_pending: input.examsPending ?? 0,
      smoking: input.smoking ?? false,
      diabetes: input.diabetes ?? false,
      cholesterol: input.cholesterol ?? false,
      hypertension: input.hypertension ?? false,
      family_history: input.familyHistory ?? false,
      clinical_notes: input.clinicalNotes ?? null,
      score_pressure: scores.score_pressure,
      score_adherence: scores.score_adherence,
      score_metabolic: scores.score_metabolic,
      score_habits: scores.score_habits,
      score_symptoms: scores.score_symptoms,
      heart_score: scores.heart_score,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function fetchProfessionals(): Promise<Professional[]> {
  const profile = await fetchProfile();
  const owner: Professional[] = profile
    ? [
        {
          id: profile.id,
          name: profile.professional_name || "Responsável",
          email: profile.email,
          role: "admin",
          status: "active",
          created_at: new Date().toISOString(),
        },
      ]
    : [];

  const { data, error } = await supabase
    .from("clinic_professionals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error && !error.message.toLowerCase().includes("does not exist")) throw error;
  return [...owner, ...((data ?? []) as Professional[])];
}

export async function inviteProfessional(email: string, role: "admin" | "professional") {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sessão expirada");
  const { error } = await supabase.from("clinic_professionals").insert({
    clinic_id: userData.user.id,
    email,
    role,
    status: "invited",
  });
  if (error) throw error;
}

export const FOLLOW_UP_DAYS = 7;

export function needsFollowUp(lastDate: string | null): boolean {
  if (!lastDate) return true;
  const diff = Date.now() - new Date(lastDate).getTime();
  return diff > FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000;
}

export function monthlyAverage(logs: CardioLog[]) {
  const groups = new Map<string, { sum: number; n: number; date: Date }>();
  for (const item of logs) {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const g = groups.get(key) ?? { sum: 0, n: 0, date: new Date(d.getFullYear(), d.getMonth(), 1) };
    g.sum += item.heart_score;
    g.n += 1;
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => +a.date - +b.date)
    .map((g) => ({
      label: g.date.toLocaleDateString("pt-BR", { month: "short" }),
      score: Math.round(g.sum / g.n),
    }));
}
