import { AuthUser } from '../core/auth.service';
import { VitalScore } from './vital';

export interface PublicUser extends AuthUser {
  crm: string | null;
  medicalRecordNumber: string | null;
  height: number | null;
}

export interface MeResponse extends PublicUser {
  doctors: PublicUser[];
  patients: PublicUser[];
}

export interface UpdateMeDto {
  fullName?: string;
  socialName?: string;
  email?: string;
  photoUrl?: string;
  height?: number | null;
  inactivityTimeout?: number;
  password?: string;
}

export interface AdminPatient {
  id: string;
  name: string;
  fullName: string;
  medicalRecordNumber: string | null;
  photoUrl: string | null;
}

export interface PressureOfPatientResponse {
  patient: AdminPatient;
  vitals: VitalScore[];
}

export interface ConsolidatedReportResponse {
  userId: string;
  from: string | null;
  to: string | null;
  profile: {
    fullName: string;
    height: number | null;
    medicalRecordNumber: string | null;
  };
  indices: SharedDataLike | null;
  vitals: VitalScore[];
  summary: Summary;
}

export interface PressureReportResponse {
  userId: string;
  vitals: VitalScore[];
  summary: Summary;
}

export interface SharedDataLike {
  bpSystolicIdeal: number | null;
  bpDiastolicIdeal: number | null;
  bpSystolicLimit: number | null;
  bpDiastolicLimit: number | null;
  glucosePreLimit: number | null;
  glucoseDiabetesLimit: number | null;
}

export interface Summary {
  systolic: Stat;
  diastolic: Stat;
  pulse: Stat;
  glucose: Stat;
  weight: Stat;
}

export interface Stat {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
}