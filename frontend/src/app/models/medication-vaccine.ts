export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
}

export interface CreateMedicationDto {
  name: string;
  dosage: string;
  frequency: string;
}

export interface Vaccine {
  id: string;
  userId: string;
  vaccineName: string;
  /** ISO date */
  vaccinationDate: string;
  seriesSchedule: string | null;
  intervalBetweenDoses: number | null;
  intervalBetweenBoosterDoses: number | null;
}

export interface CreateVaccineDto {
  vaccineName: string;
  vaccinationDate: string;
  seriesSchedule?: string;
  intervalBetweenDoses?: number;
  intervalBetweenBoosterDoses?: number;
}

export interface ExamType {
  id: string;
  label: string;
}

export interface SharedData {
  id: number;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  bpSystolicIdeal: number | null;
  bpDiastolicIdeal: number | null;
  bpSystolicLimit: number | null;
  bpDiastolicLimit: number | null;
  glucosePreLimit: number | null;
  glucoseDiabetesLimit: number | null;
}

export interface HealthIndices {
  bloodPressure: {
    systolicIdeal?: number | null;
    diastolicIdeal?: number | null;
    systolicLimit?: number | null;
    diastolicLimit?: number | null;
  };
  glucose: {
    preLimit: number;
    diabetesLimit: number;
  };
}

export interface UpdateSharedDataDto {
  bpSystolicIdeal?: number | null;
  bpDiastolicIdeal?: number | null;
  bpSystolicLimit?: number | null;
  bpDiastolicLimit?: number | null;
  glucosePreLimit?: number | null;
  glucoseDiabetesLimit?: number | null;
}