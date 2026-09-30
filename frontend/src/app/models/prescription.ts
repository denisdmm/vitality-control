export type PrescriptionStatus = 'ATIVA' | 'ENCERRADA';

export interface MedicationSchedule {
  id: string;
  /** Horário de parede "HH:mm"; a ordenação é a do próprio texto. */
  time: string;
}

export interface PrescriptionMedication {
  id: string;
  prescriptionId: string;
  name: string;
  dosage: string;
  frequency: string;
  continuousUse: boolean;
  /** Duração do tratamento em dias; `null` = sem prazo definido. */
  durationDays: number | null;
  /** Preenchido quando o item foi prescrito por médico; o paciente não pode editá-lo. */
  prescribedById: string | null;
  prescriptionStatus: PrescriptionStatus | null;
  schedules: MedicationSchedule[];
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string | null;
  issuedAt: string;
  status: PrescriptionStatus;
  /** `false` quando a receita foi registrada sem PDF; `fileDisplayName` vem `null`. */
  hasFile: boolean;
  fileDisplayName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
  medications: PrescriptionMedication[];
}

export interface ActiveMedication {
  id: string;
  prescriptionId: string;
  name: string;
  dosage: string;
  frequency: string;
  continuousUse: boolean;
  durationDays: number | null;
  prescribedById: string | null;
  prescriptionStatus: PrescriptionStatus | null;
  schedules: MedicationSchedule[];
}

/** Item do formulário de nova receita, antes de ganhar `id`. */
export interface PrescriptionMedicationDraft {
  name: string;
  dosage: string;
  frequency: string;
  /** Vazio = sem prazo definido. */
  durationDays: number | null;
  continuousUse: boolean;
  /** Horários "HH:mm" já sem repetição. */
  schedules: string[];
}

export interface CreatePrescriptionDto {
  medications: PrescriptionMedicationDraft[];
  issuedAt?: string;
}

export interface CreatePrescriptionMedicationDto {
  name: string;
  dosage: string;
  frequency: string;
  /** `null` ou ausente = sem prazo definido. */
  durationDays?: number | null;
  continuousUse?: boolean;
}

export interface UpdatePrescriptionMedicationDto {
  name?: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number | null;
  continuousUse?: boolean;
}

/** Texto de exibição da duração: "30 dias", "uso contínuo" ou "sem prazo definido". */
export function formatDuration(medication: { continuousUse: boolean; durationDays: number | null }): string {
  if (medication.durationDays !== null) {
    const days = medication.durationDays;
    return days === 1 ? '1 dia' : `${days} dias`;
  }
  return medication.continuousUse ? 'uso contínuo' : 'sem prazo definido';
}
