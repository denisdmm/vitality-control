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
  fileDisplayName: string;
  fileMimeType: string;
  fileSize: number;
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
  prescribedById: string | null;
  prescriptionStatus: PrescriptionStatus | null;
  schedules: MedicationSchedule[];
}

export interface CreatePrescriptionMedicationDto {
  name: string;
  dosage: string;
  frequency: string;
  continuousUse?: boolean;
}

export interface UpdatePrescriptionMedicationDto {
  name?: string;
  dosage?: string;
  frequency?: string;
  continuousUse?: boolean;
}
