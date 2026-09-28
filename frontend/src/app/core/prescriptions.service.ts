import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api';
import { AuthService } from './auth.service';
import type {
  ActiveMedication,
  CreatePrescriptionMedicationDto,
  MedicationSchedule,
  Prescription,
  PrescriptionMedication,
  PrescriptionStatus,
  UpdatePrescriptionMedicationDto,
} from '../models/prescription';

/**
 * Estado único do receituário: o dashboard, a página do paciente e a do médico
 * leem os mesmos signals, então salvar horários ou encerrar uma receita atualiza
 * a listagem de ativos sem recarregar a página.
 */
@Injectable({ providedIn: 'root' })
export class PrescriptionsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly base = `${API_BASE}/prescriptions`;
  private readonly medicationsBase = `${API_BASE}/medications`;

  readonly prescriptions = signal<Prescription[]>([]);
  readonly activeMedications = signal<ActiveMedication[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly isDoctor = computed(() => this.auth.user()?.role === 'MEDICO');

  // ── Receitas do paciente logado ─────────────────────────────────────────

  async listMine(status?: PrescriptionStatus): Promise<Prescription[]> {
    const query = status ? `?status=${status}` : '';
    const result = await firstValueFrom(this.http.get<Prescription[]>(`${this.base}${query}`));
    if (!status) this.prescriptions.set(result);
    return result;
  }

  // ── Receitas de um paciente (visão do médico) ───────────────────────────

  listForPatient(patientId: string, status?: PrescriptionStatus): Promise<Prescription[]> {
    const query = status ? `?status=${status}` : '';
    return firstValueFrom(
      this.http.get<Prescription[]>(`${API_BASE}/patients/${patientId}/prescriptions${query}`),
    );
  }

  // ── Ativos ──────────────────────────────────────────────────────────────

  listActive(): Promise<ActiveMedication[]> {
    return firstValueFrom(this.http.get<ActiveMedication[]>(`${this.medicationsBase}/active`));
  }

  listActiveForPatient(patientId: string): Promise<ActiveMedication[]> {
    return firstValueFrom(
      this.http.get<ActiveMedication[]>(`${API_BASE}/patients/${patientId}/medications/active`),
    );
  }

  // ── Criação com PDF ─────────────────────────────────────────────────────

  /** `FormData` sem `Content-Type` manual: o browser define a boundary. */
  createMine(file: File, fileDisplayName: string, issuedAt?: string): Promise<Prescription> {
    return this.sendForm(`${this.base}`, file, fileDisplayName, issuedAt);
  }

  createForPatient(patientId: string, file: File, fileDisplayName: string, issuedAt?: string) {
    return this.sendForm(`${API_BASE}/patients/${patientId}/prescriptions`, file, fileDisplayName, issuedAt);
  }

  private sendForm(url: string, file: File, fileDisplayName: string, issuedAt?: string) {
    const form = new FormData();
    form.append('fileDisplayName', fileDisplayName);
    if (issuedAt) form.append('issuedAt', issuedAt);
    form.append('file', file, file.name);
    return firstValueFrom(this.http.post<Prescription>(url, form));
  }

  /**
   * O download passa pelo HttpClient porque o endpoint exige o Bearer token; o
   * nome usado na tela é o `fileDisplayName` escolhido no upload.
   */
  downloadPdf(prescriptionId: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`${this.base}/${prescriptionId}/file`, { responseType: 'blob' }),
    );
  }

  // ── Status ──────────────────────────────────────────────────────────────

  /** Dono da receita ou médico emissor: mesma rota nos dois papéis. */
  setStatus(prescriptionId: string, status: PrescriptionStatus) {
    return firstValueFrom(this.http.patch<Prescription>(`${this.base}/${prescriptionId}/status`, { status }));
  }

  remove(prescriptionId: string): Promise<{ deleted: string }> {
    return firstValueFrom(this.http.delete<{ deleted: string }>(`${this.base}/${prescriptionId}`));
  }

  // ── Medicamentos ────────────────────────────────────────────────────────

  addMedication(prescriptionId: string, dto: CreatePrescriptionMedicationDto) {
    return firstValueFrom(
      this.http.post<PrescriptionMedication>(`${this.base}/${prescriptionId}/medications`, dto),
    );
  }

  updateMedication(id: string, dto: UpdatePrescriptionMedicationDto) {
    return firstValueFrom(
      this.http.patch<PrescriptionMedication>(`${this.medicationsBase}/${id}`, dto),
    );
  }

  removeMedication(id: string): Promise<{ deleted: string; name: string }> {
    return firstValueFrom(
      this.http.delete<{ deleted: string; name: string }>(`${this.medicationsBase}/${id}`),
    );
  }

  // ── Horários ────────────────────────────────────────────────────────────

  addSchedule(medicationId: string, time: string): Promise<MedicationSchedule> {
    return firstValueFrom(
      this.http.post<MedicationSchedule>(`${this.medicationsBase}/${medicationId}/schedules`, { time }),
    );
  }

  removeSchedule(scheduleId: string): Promise<{ deleted: string; time: string }> {
    return firstValueFrom(
      this.http.delete<{ deleted: string; time: string }>(`${API_BASE}/medication-schedules/${scheduleId}`),
    );
  }

  // ── Estado compartilhado ────────────────────────────────────────────────

  /** Recarrega receitas e ativos do paciente logado; usado ao entrar nas telas. */
  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [prescriptions, active] = await Promise.all([this.listMine(), this.listActive()]);
      this.prescriptions.set(prescriptions);
      this.activeMedications.set(active);
    } catch (error) {
      this.error.set('Não foi possível carregar o receituário.');
      this.prescriptions.set([]);
      this.activeMedications.set([]);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
}
