export type PatientScope = 'mine' | 'all';
export type AuditAction = 'LINK_ADDED' | 'LINK_REMOVED' | 'PATIENT_TRANSFERRED' | 'CHART_VIEWED';

export interface PanelDoctor {
  id: string;
  name: string;
  fullName: string;
  crm: string | null;
  role: 'MEDICO' | 'ADMINISTRADOR';
  since?: string;
}

export interface PatientSignals {
  medicationsWithoutSchedule: number;
  noRecentMeasurement: boolean;
  examOverdue: boolean;
  pending: boolean;
}

export interface PanelPatient {
  id: string;
  name: string;
  fullName: string;
  medicalRecordNumber: string | null;
  photoUrl: string | null;
  /** Última consulta: emissão mais recente de receita, por qualquer médico. */
  lastPrescriptionAt: string | null;
  lastMeasurementAt: string | null;
  lastExamAt: string | null;
  linkedToMe: boolean;
  doctors: PanelDoctor[];
  signals: PatientSignals;
  counts: { exams: number; notes: number };
}

export interface PatientListResponse {
  items: PanelPatient[];
  total: number;
  page: number;
  limit: number;
  scope: PatientScope;
}

export interface VitalIndicator {
  last: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
}

export interface PatientVitals {
  windowDays: number;
  from: string;
  to: string;
  hasRecentMeasurements: boolean;
  series: {
    date: string;
    weight: number | null;
    bloodPressure: Record<string, { systolic?: number; diastolic?: number; pulse?: number } | null> | null;
    glucose: Record<string, { value?: number } | null> | null;
  }[];
  indicators: Record<'systolic' | 'diastolic' | 'pulse' | 'glucose' | 'weight', VitalIndicator>;
  previousIndicators: Record<'systolic' | 'diastolic' | 'pulse' | 'glucose' | 'weight', VitalIndicator>;
  averageDelta: Partial<Record<'systolic' | 'diastolic' | 'pulse' | 'glucose' | 'weight', number | null>>;
}

export interface HealthThresholds {
  bpSystolic: number | null;
  bpDiastolic: number | null;
  bpSystolicIdeal: number | null;
  bpDiastolicIdeal: number | null;
  bpSystolicLimit: number | null;
  bpDiastolicLimit: number | null;
  glucosePreLimit: number | null;
  glucoseDiabetesLimit: number | null;
}

export interface PanelMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  continuousUse: boolean;
  schedules: string[];
  prescribedBy: { id: string; name: string } | null;
}

export interface PanelPrescription {
  id: string;
  issuedAt: string;
  status: 'ATIVA' | 'ENCERRADA';
  doctor: { id: string; name: string } | null;
  medications: { id: string; name: string; dosage: string; frequency: string; continuousUse: boolean }[];
}

export interface PanelExam {
  id: string;
  name: string;
  type: string | null;
  requestDate: string;
  examDate: string | null;
  result: string | null;
  status: string;
  requestingDoctorName: string | null;
  subItems: { id: string; name: string; result: string; reference: string }[];
}

export interface ClinicalNote {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
  canEdit: boolean;
  canDelete: boolean;
}

export interface PatientSummary {
  patient: {
    id: string;
    name: string;
    fullName: string;
    medicalRecordNumber: string | null;
    photoUrl: string | null;
  };
  linkedToMe: boolean;
  doctors: PanelDoctor[];
  vitals: PatientVitals;
  thresholds: HealthThresholds | null;
  medications: PanelMedication[];
  prescriptions: PanelPrescription[];
  exams: PanelExam[];
  notes: ClinicalNote[];
}

export interface LinkState {
  patientId: string;
  linkedToMe: boolean;
  doctors: PanelDoctor[];
}

export interface AuditEvent {
  id: string;
  action: AuditAction;
  createdAt: string;
  patientId: string;
  actor: { id: string; name: string; fullName: string; role: string };
  subjectDoctor: { id: string; name: string; fullName: string } | null;
}
