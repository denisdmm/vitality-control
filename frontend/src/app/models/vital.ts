export type PeriodName = 'manha' | 'tarde' | 'noite';

export interface BloodPressurePeriod {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
}

export interface GlucosePeriod {
  value?: number;
}

export type BloodPressureDay = Partial<Record<PeriodName, BloodPressurePeriod | null>>;
export type GlucoseDay = Partial<Record<PeriodName, GlucosePeriod | null>>;

export interface VitalScore {
  id: string;
  userId: string;
  /** ISO date serializado pelo Prisma (ex.: 2026-09-17T00:00:00.000Z) */
  date: string;
  bloodPressurePeriods: BloodPressureDay | null;
  glucosePeriods: GlucoseDay | null;
  weight: number | null;
}

export interface VitalsListResponse extends Array<VitalScore> {}

export interface VitalsDailyPayload {
  date: string;
  bloodPressure?: BloodPressureDay | null;
  glucose?: GlucoseDay | null;
  weight?: number | null;
}