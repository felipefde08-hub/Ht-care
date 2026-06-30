export type RiskLevel = "baixo" | "moderado" | "alto";

export interface RiskResult {
  score: number;
  level: RiskLevel;
  color: string;
  label: string;
  factors: string[];
}

export interface InitialRiskInput {
  age: string | number;
  biologicalSex: "feminino" | "masculino" | "";
  smokes: "sim" | "ex_fumante_menos_5" | "ex_fumante_mais_5" | "nao" | "";
  diabetes: "sim" | "diabetes_tipo_1" | "diabetes_tipo_2" | "pre_diabetes" | "nao" | "nao_sei" | "";
  knowsBloodPressure: "sim" | "nao" | "";
  systolic: string | number;
  diastolic?: string | number;
  knowsCholesterol: "sim" | "nao" | "";
  ldl: string | number;
  hdl: string | number;
  totalCholesterol: string | number;
  familyHistory?: "sim" | "nao" | "nao_sei" | "";
  weight?: string | number;
  height?: string | number;
  activityLevel?: "sedentario" | "leve" | "moderado" | "intenso" | "";
  previousCardiacDiagnosis?: "sim" | "nao" | "";
  frequentSymptoms?: string[];
  stressLevel?: "baixo" | "moderado" | "alto" | "";
  sleepHours?: "menos_5" | "5_6" | "7_8" | "mais_8" | "";
  alcoholUse?: "nao_bebo" | "socialmente" | "algumas_vezes_semana" | "diariamente" | "";
  waistCircumference?: string | number;
  sleepApnea?: "sim" | "nao" | "nao_sei" | "";
}

export interface CheckInRiskInput {
  feeling: "bem" | "cansado" | "mal" | "";
  symptoms: string[];
  measuredBloodPressure: "sim" | "nao" | "";
  systolic: string | number;
  diastolic: string | number;
  measuredGlucose: "sim" | "nao" | "";
  glucose: string | number;
}

export const RISK_WEIGHTS = {
  apob_high: -25,
  apob_borderline: -12,
  ldl_high: -15,
  ldl_borderline: -8,
  hdl_low: -12,
  trig_high: -10,
  homa_ir_high: -20,
  homa_ir_borderline: -10,
  hbA1c_diabetes: -25,
  hbA1c_prediabetes: -15,
  pcr_us_high: -15,
  pcr_us_moderate: -8,
  smoker_current: -25,
  smoker_ex_recent: -12,
  smoker_ex_remote: -8,
  hypertension_stage2: -28,
  hypertension_stage1: -15,
  blood_pressure_unknown: -5,
  cholesterol_unknown: -4,
  bmi_obese2: -22,
  bmi_obese1: -15,
  bmi_overweight: -8,
  diabetes_type1: -15,
  diabetes_type2: -20,
  diabetes_unknown: -5,
  prediabetes: -12,
  family_history: -10,
  family_history_unknown: -3,
  sedentary: -12,
  light_activity: -6,
  moderate_activity_gap: -2,
  previous_cardiac_diagnosis: -15,
  sleep_poor: -8,
  sleep_short: -4,
  sleep_long: -2,
  stress_high: -6,
  stress_moderate: -3,
  alcohol_daily: -10,
  alcohol_weekly: -5,
  alcohol_social: -2,
  waist_elevated: -8,
  sleep_apnea: -6,
  sleep_apnea_unknown: -2,
  severe_factor_cluster: -10,
} as const;

export const SCORE_BASELINE = 88;

const PROTECTIVE_BONUSES = {
  younger_than_40: 4,
  optimal_pressure: 6,
  normal_bmi: 4,
  never_smoked: 3,
  no_diabetes: 3,
  ideal_cholesterol: 4,
  intense_activity: 5,
  ideal_sleep: 2,
} as const;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toNumber(value: string | number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function riskCategoryFromScore(score: number): RiskLevel {
  if (score >= 80) return "baixo";
  if (score >= 50) return "moderado";
  return "alto";
}

export function riskLabel(level: RiskLevel) {
  if (level === "baixo") return "Risco baixo";
  if (level === "moderado") return "Risco moderado";
  return "Risco alto";
}

export function riskColor(level: RiskLevel) {
  if (level === "baixo") return "#2f9e72";
  if (level === "moderado") return "#d89a1d";
  return "#c4413a";
}

export function buildRiskResult(score: number, factors: string[]): RiskResult {
  const safeScore = clampScore(score);
  const level = riskCategoryFromScore(safeScore);
  return {
    score: safeScore,
    level,
    color: riskColor(level),
    label: riskLabel(level),
    factors: factors.length
      ? factors.slice(0, 5)
      : ["perfil inicial sem fatores críticos informados"],
  };
}

export function calculateInitialRiskScore(input: InitialRiskInput): RiskResult {
  const factors: string[] = [];
  const age = toNumber(input.age);
  const systolic = toNumber(input.systolic);
  const diastolic = toNumber(input.diastolic ?? 0);
  const totalCholesterol = toNumber(input.totalCholesterol);
  const ldl = toNumber(input.ldl);
  const hdl = toNumber(input.hdl);
  const bmi = calculateBmi(input.weight, input.height);
  const waist = toNumber(input.waistCircumference ?? 0);
  let riskPoints = 0;
  let hasCurrentSmoker = false;
  let hasStage2Hypertension = false;
  let hasObesity = false;
  let protectivePoints = 0;

  function add(points: number, factor: string) {
    riskPoints += points;
    if (!factors.includes(factor)) factors.push(factor);
  }

  function protect(points: number) {
    protectivePoints += points;
  }

  if (age > 0 && age < 40) protect(PROTECTIVE_BONUSES.younger_than_40);

  if (input.smokes === "sim") {
    hasCurrentSmoker = true;
    add(Math.abs(RISK_WEIGHTS.smoker_current), "tabagismo");
  }
  if (input.smokes === "ex_fumante_menos_5")
    add(Math.abs(RISK_WEIGHTS.smoker_ex_recent), "ex-tabagismo recente");
  if (input.smokes === "ex_fumante_mais_5")
    add(Math.abs(RISK_WEIGHTS.smoker_ex_remote), "histórico de tabagismo");
  if (input.smokes === "nao") protect(PROTECTIVE_BONUSES.never_smoked);
  if (input.diabetes === "sim" || input.diabetes === "diabetes_tipo_2")
    add(Math.abs(RISK_WEIGHTS.diabetes_type2), "diabetes tipo 2 diagnosticado");
  if (input.diabetes === "diabetes_tipo_1")
    add(Math.abs(RISK_WEIGHTS.diabetes_type1), "diabetes tipo 1 diagnosticado");
  if (input.diabetes === "pre_diabetes")
    add(Math.abs(RISK_WEIGHTS.prediabetes), "pré-diabetes diagnosticado");
  if (input.diabetes === "nao_sei")
    add(Math.abs(RISK_WEIGHTS.diabetes_unknown), "status de diabetes desconhecido");
  if (input.diabetes === "nao") protect(PROTECTIVE_BONUSES.no_diabetes);

  if (input.knowsBloodPressure === "sim") {
    if (systolic >= 160 || diastolic >= 100) {
      hasStage2Hypertension = true;
      add(Math.abs(RISK_WEIGHTS.hypertension_stage2), "hipertensão estágio 2");
    } else if (systolic >= 140 || diastolic >= 90)
      add(Math.abs(RISK_WEIGHTS.hypertension_stage1), "hipertensão estágio 1");
    else if (systolic >= 120 || diastolic >= 80) add(8, "pressão arterial elevada");
    else if (systolic > 0 && diastolic > 0) protect(PROTECTIVE_BONUSES.optimal_pressure);
  } else {
    add(Math.abs(RISK_WEIGHTS.blood_pressure_unknown), "pressão arterial não informada");
  }

  if (bmi != null) {
    if (bmi >= 35) {
      hasObesity = true;
      add(Math.abs(RISK_WEIGHTS.bmi_obese2), "IMC em faixa de obesidade grau 2/3");
    } else if (bmi >= 30) {
      hasObesity = true;
      add(Math.abs(RISK_WEIGHTS.bmi_obese1), "IMC em faixa de obesidade grau 1");
    } else if (bmi >= 25) add(Math.abs(RISK_WEIGHTS.bmi_overweight), "IMC em faixa de sobrepeso");
    else if (bmi >= 18.5) protect(PROTECTIVE_BONUSES.normal_bmi);
  }

  if (input.knowsCholesterol === "sim") {
    if (totalCholesterol >= 240 || ldl >= 160 || (hdl > 0 && hdl < 35)) {
      add(12, "colesterol alto");
    } else if (totalCholesterol >= 200 || ldl >= 130 || (hdl > 0 && hdl < 40)) {
      add(6, "colesterol levemente alterado");
    } else if (totalCholesterol > 0 || ldl > 0 || hdl > 0) {
      protect(PROTECTIVE_BONUSES.ideal_cholesterol);
    }
  } else {
    add(Math.abs(RISK_WEIGHTS.cholesterol_unknown), "colesterol não informado");
  }

  if (input.familyHistory === "sim")
    add(Math.abs(RISK_WEIGHTS.family_history), "histórico familiar de infarto ou AVC precoce");
  if (input.familyHistory === "nao_sei")
    add(Math.abs(RISK_WEIGHTS.family_history_unknown), "histórico familiar desconhecido");

  if (input.activityLevel === "sedentario")
    add(Math.abs(RISK_WEIGHTS.sedentary), "baixo nível de atividade física");
  if (input.activityLevel === "leve")
    add(Math.abs(RISK_WEIGHTS.light_activity), "atividade física 1-2x por semana");
  if (input.activityLevel === "moderado")
    add(Math.abs(RISK_WEIGHTS.moderate_activity_gap), "atividade física abaixo do ideal");
  if (input.activityLevel === "intenso") protect(PROTECTIVE_BONUSES.intense_activity);

  if (input.previousCardiacDiagnosis === "sim")
    add(Math.abs(RISK_WEIGHTS.previous_cardiac_diagnosis), "diagnóstico cardíaco anterior");

  for (const symptom of input.frequentSymptoms ?? []) {
    if (symptom === "dor ou aperto no peito") add(10, "dor ou aperto no peito");
    if (symptom === "falta de ar ao fazer esforço leve")
      add(8, "falta de ar ao fazer esforço leve");
    if (symptom === "palpitação/coração acelerado sem motivo") add(6, "palpitação sem motivo");
    if (symptom === "inchaço nas pernas/tornozelos") add(6, "inchaço nas pernas ou tornozelos");
  }

  if (input.stressLevel === "alto") add(Math.abs(RISK_WEIGHTS.stress_high), "estresse elevado");
  if (input.stressLevel === "moderado")
    add(Math.abs(RISK_WEIGHTS.stress_moderate), "estresse moderado");

  if (input.sleepHours === "menos_5") add(Math.abs(RISK_WEIGHTS.sleep_poor), "sono insuficiente");
  if (input.sleepHours === "5_6")
    add(Math.abs(RISK_WEIGHTS.sleep_short), "sono abaixo do recomendado");
  if (input.sleepHours === "mais_8")
    add(Math.abs(RISK_WEIGHTS.sleep_long), "sono acima de 8 horas");
  if (input.sleepHours === "7_8") protect(PROTECTIVE_BONUSES.ideal_sleep);

  if (input.alcoholUse === "diariamente")
    add(Math.abs(RISK_WEIGHTS.alcohol_daily), "consumo diário de álcool");
  if (input.alcoholUse === "algumas_vezes_semana")
    add(Math.abs(RISK_WEIGHTS.alcohol_weekly), "consumo frequente de álcool");
  if (input.alcoholUse === "socialmente")
    add(Math.abs(RISK_WEIGHTS.alcohol_social), "consumo social de álcool");

  if (isWaistElevated(waist, input.biologicalSex))
    add(Math.abs(RISK_WEIGHTS.waist_elevated), "circunferência abdominal elevada");

  if (input.sleepApnea === "sim")
    add(Math.abs(RISK_WEIGHTS.sleep_apnea), "apneia do sono ou ronco importante");
  if (input.sleepApnea === "nao_sei")
    add(Math.abs(RISK_WEIGHTS.sleep_apnea_unknown), "apneia do sono desconhecida");

  if (hasCurrentSmoker && hasStage2Hypertension && hasObesity) {
    add(Math.abs(RISK_WEIGHTS.severe_factor_cluster), "combinação de fatores graves simultâneos");
  }

  return buildRiskResult(SCORE_BASELINE + protectivePoints - riskPoints, factors);
}

export function updateRiskScoreFromCheckIn(baseScore: number, input: CheckInRiskInput): RiskResult {
  const factors: string[] = [];
  const systolic = toNumber(input.systolic);
  const diastolic = toNumber(input.diastolic);
  const glucose = toNumber(input.glucose);
  const hasSymptoms = input.symptoms.some((item) => item !== "nenhum");
  let delta = 0;

  function adjust(points: number, factor: string) {
    delta += points;
    if (points < 0 && !factors.includes(factor)) factors.push(factor);
  }

  if (input.feeling === "bem") delta += 1;
  if (input.feeling === "cansado") adjust(-2, "cansaço no check-in");
  if (input.feeling === "mal") adjust(-5, "mal-estar no check-in");
  if (hasSymptoms)
    adjust(-Math.min(12, input.symptoms.length * 4), "sintomas relatados na última semana");

  if (input.measuredBloodPressure === "sim") {
    if (systolic >= 160 || diastolic >= 100) adjust(-12, "pressão muito elevada no check-in");
    else if (systolic >= 140 || diastolic >= 90) adjust(-7, "pressão elevada no check-in");
    else if (systolic < 130 && diastolic < 85) delta += 2;
  }

  if (input.measuredGlucose === "sim") {
    if (glucose >= 126) adjust(-5, "glicemia elevada no check-in");
    else if (glucose >= 100) adjust(-2, "glicemia limítrofe no check-in");
    else if (glucose > 0) delta += 1;
  }

  return buildRiskResult(baseScore + delta, factors);
}

function calculateBmi(weight?: string | number, height?: string | number) {
  const weightValue = toNumber(weight ?? 0);
  const heightValue = toNumber(height ?? 0) / 100;
  if (!weightValue || !heightValue) return null;
  return weightValue / (heightValue * heightValue);
}

function isWaistElevated(waist: number, sex: InitialRiskInput["biologicalSex"]) {
  if (!waist) return false;
  if (sex === "feminino") return waist >= 88;
  if (sex === "masculino") return waist >= 102;
  return waist >= 94;
}
