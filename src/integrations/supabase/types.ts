export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      patients: {
        Row: {
          age: number | null;
          created_at: string;
          guardian: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          sex: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          age?: number | null;
          created_at?: string;
          guardian?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          sex?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          age?: number | null;
          created_at?: string;
          guardian?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          sex?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          altura_cm: number | null;
          avatar_url: string | null;
          clinic_name: string;
          cidade: string | null;
          cpf: string | null;
          created_at: string;
          data_nascimento: string | null;
          diabetes_status: "nao" | "pre_diabetes" | "diabetes" | "nao_sei" | null;
          email: string;
          fumante: boolean | null;
          historico_familiar: boolean | null;
          id: string;
          idade: number | null;
          motivo_principal: string[] | null;
          nivel_atividade: "sedentario" | "leve" | "moderado" | "intenso" | null;
          nome: string | null;
          peso_kg: number | null;
          professional_name: string;
          sexo: string | null;
          telefone: string | null;
          updated_at: string;
        };
        Insert: {
          altura_cm?: number | null;
          avatar_url?: string | null;
          clinic_name?: string;
          cidade?: string | null;
          cpf?: string | null;
          created_at?: string;
          data_nascimento?: string | null;
          diabetes_status?: "nao" | "pre_diabetes" | "diabetes" | "nao_sei" | null;
          email?: string;
          fumante?: boolean | null;
          historico_familiar?: boolean | null;
          id: string;
          idade?: number | null;
          motivo_principal?: string[] | null;
          nivel_atividade?: "sedentario" | "leve" | "moderado" | "intenso" | null;
          nome?: string | null;
          peso_kg?: number | null;
          professional_name?: string;
          sexo?: string | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Update: {
          altura_cm?: number | null;
          avatar_url?: string | null;
          clinic_name?: string;
          cidade?: string | null;
          cpf?: string | null;
          created_at?: string;
          data_nascimento?: string | null;
          diabetes_status?: "nao" | "pre_diabetes" | "diabetes" | "nao_sei" | null;
          email?: string;
          fumante?: boolean | null;
          historico_familiar?: boolean | null;
          id?: string;
          idade?: number | null;
          motivo_principal?: string[] | null;
          nivel_atividade?: "sedentario" | "leve" | "moderado" | "intenso" | null;
          nome?: string | null;
          peso_kg?: number | null;
          professional_name?: string;
          sexo?: string | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          achievement_unlocked: boolean;
          new_mission: boolean;
          updated_at: string;
          user_id: string;
          weekly_checkin: boolean;
          weekly_summary_email: boolean;
        };
        Insert: {
          achievement_unlocked?: boolean;
          new_mission?: boolean;
          updated_at?: string;
          user_id: string;
          weekly_checkin?: boolean;
          weekly_summary_email?: boolean;
        };
        Update: {
          achievement_unlocked?: boolean;
          new_mission?: boolean;
          updated_at?: string;
          user_id?: string;
          weekly_checkin?: boolean;
          weekly_summary_email?: boolean;
        };
        Relationships: [];
      };
      medications: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          dose: string | null;
          id: string;
          reminder_enabled: boolean;
          schedule_times: string[];
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          description: string;
          dose?: string | null;
          id?: string;
          reminder_enabled?: boolean;
          schedule_times?: string[];
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          dose?: string | null;
          id?: string;
          reminder_enabled?: boolean;
          schedule_times?: string[];
          user_id?: string;
        };
        Relationships: [];
      };
      medication_adherence_logs: {
        Row: {
          id: string;
          log_date: string;
          medication_id: string;
          taken_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          log_date?: string;
          medication_id: string;
          taken_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          log_date?: string;
          medication_id?: string;
          taken_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      exams: {
        Row: {
          created_at: string;
          exam_date: string | null;
          file_path: string | null;
          file_type: string | null;
          file_url: string | null;
          id: string;
          name: string;
          notes: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          exam_date?: string | null;
          file_path?: string | null;
          file_type?: string | null;
          file_url?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          exam_date?: string | null;
          file_path?: string | null;
          file_type?: string | null;
          file_url?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      carelito_conversations: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          metadata: Json;
          role: "user" | "assistant";
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          metadata?: Json;
          role: "user" | "assistant";
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          metadata?: Json;
          role?: "user" | "assistant";
          user_id?: string;
        };
        Relationships: [];
      };
      user_activity_days: {
        Row: {
          actions: string[];
          activity_date: string;
          created_at: string;
          id: string;
          last_seen_at: string;
          user_id: string;
        };
        Insert: {
          actions?: string[];
          activity_date: string;
          created_at?: string;
          id?: string;
          last_seen_at?: string;
          user_id: string;
        };
        Update: {
          actions?: string[];
          activity_date?: string;
          created_at?: string;
          id?: string;
          last_seen_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_activity_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          points: number;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          points?: number;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          points?: number;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      assessments: {
        Row: {
          categoria_risco: "baixo" | "moderado" | "alto";
          created_at: string;
          fatores_que_pesaram: string[];
          id: string;
          origem: "onboarding" | "checkin";
          score: number;
          user_id: string;
        };
        Insert: {
          categoria_risco: "baixo" | "moderado" | "alto";
          created_at?: string;
          fatores_que_pesaram?: string[];
          id?: string;
          origem: "onboarding" | "checkin";
          score: number;
          user_id: string;
        };
        Update: {
          categoria_risco?: "baixo" | "moderado" | "alto";
          created_at?: string;
          fatores_que_pesaram?: string[];
          id?: string;
          origem?: "onboarding" | "checkin";
          score?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          created_at: string;
          glicemia: number | null;
          humor: "bem" | "cansado" | "mal";
          id: string;
          peso_kg: number | null;
          pressao_diastolica: number | null;
          pressao_sistolica: number | null;
          sintomas: string[];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          glicemia?: number | null;
          humor: "bem" | "cansado" | "mal";
          id?: string;
          peso_kg?: number | null;
          pressao_diastolica?: number | null;
          pressao_sistolica?: number | null;
          sintomas?: string[];
          user_id: string;
        };
        Update: {
          created_at?: string;
          glicemia?: number | null;
          humor?: "bem" | "cansado" | "mal";
          id?: string;
          peso_kg?: number | null;
          pressao_diastolica?: number | null;
          pressao_sistolica?: number | null;
          sintomas?: string[];
          user_id?: string;
        };
        Relationships: [];
      };
      clinic_professionals: {
        Row: {
          clinic_id: string;
          created_at: string;
          email: string;
          id: string;
          name: string | null;
          role: "admin" | "professional";
          status: "active" | "invited";
        };
        Insert: {
          clinic_id: string;
          created_at?: string;
          email: string;
          id?: string;
          name?: string | null;
          role?: "admin" | "professional";
          status?: "active" | "invited";
        };
        Update: {
          clinic_id?: string;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string | null;
          role?: "admin" | "professional";
          status?: "active" | "invited";
        };
        Relationships: [];
      };
      cardio_logs: {
        Row: {
          activity: number;
          cholesterol: boolean;
          clinical_notes: string | null;
          created_at: string;
          diabetes: boolean;
          diastolic: number;
          exams_pending: number;
          family_history: boolean;
          heart_rate: number;
          heart_score: number;
          hypertension: boolean;
          id: string;
          medication_adherence: number;
          patient_id: string;
          score_adherence: number;
          score_habits: number;
          score_metabolic: number;
          score_pressure: number;
          score_symptoms: number;
          smoking: boolean;
          symptoms: number;
          systolic: number;
          user_id: string;
          weight: number | null;
        };
        Insert: {
          activity: number;
          cholesterol?: boolean;
          clinical_notes?: string | null;
          created_at?: string;
          diabetes?: boolean;
          diastolic: number;
          exams_pending?: number;
          family_history?: boolean;
          heart_rate: number;
          heart_score: number;
          hypertension?: boolean;
          id?: string;
          medication_adherence: number;
          patient_id: string;
          score_adherence: number;
          score_habits: number;
          score_metabolic: number;
          score_pressure: number;
          score_symptoms: number;
          smoking?: boolean;
          symptoms: number;
          systolic: number;
          user_id: string;
          weight?: number | null;
        };
        Update: {
          activity?: number;
          cholesterol?: boolean;
          clinical_notes?: string | null;
          created_at?: string;
          diabetes?: boolean;
          diastolic?: number;
          exams_pending?: number;
          family_history?: boolean;
          heart_rate?: number;
          heart_score?: number;
          hypertension?: boolean;
          id?: string;
          medication_adherence?: number;
          patient_id?: string;
          score_adherence?: number;
          score_habits?: number;
          score_metabolic?: number;
          score_pressure?: number;
          score_symptoms?: number;
          smoking?: boolean;
          symptoms?: number;
          systolic?: number;
          user_id?: string;
          weight?: number | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      assessment_origem: "onboarding" | "checkin";
      categoria_risco: "baixo" | "moderado" | "alto";
      checkin_humor: "bem" | "cansado" | "mal";
      diabetes_status: "nao" | "pre_diabetes" | "diabetes" | "nao_sei";
      nivel_atividade: "sedentario" | "leve" | "moderado" | "intenso";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
