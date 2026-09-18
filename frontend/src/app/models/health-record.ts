export type HealthRecordStatus = 'SOLICITADO' | 'AGENDADO' | 'REALIZADO';

export interface SubItem {
  id: string;
  recordId: string;
  name: string;
  result: string;
  reference: string;
}

export interface HealthRecord {
  id: string;
  userId: string;
  name: string;
  type: string | null;
  requestDate: string;
  examDate: string | null;
  result: string | null;
  status: HealthRecordStatus;
  requestingDoctorName: string | null;
  requestingDoctorCrm: string | null;
  createdAt?: string;
  updatedAt?: string;
  subItems?: SubItem[];
}

export interface CreateHealthRecordDto {
  name: string;
  type?: string;
  requestDate?: string;
  examDate?: string | null;
  result?: string;
  status?: HealthRecordStatus;
  requestingDoctorName?: string;
  requestingDoctorCrm?: string;
}

export interface UpdateHealthRecordDto {
  name?: string;
  type?: string;
  requestDate?: string;
  examDate?: string | null;
  result?: string;
  status?: HealthRecordStatus;
  requestingDoctorName?: string;
  requestingDoctorCrm?: string;
}

export interface CreateSubItemDto {
  name: string;
  result: string;
  reference: string;
}