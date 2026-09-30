import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api';
import type {
  AuditEvent,
  ClinicalNote,
  LinkState,
  PatientListResponse,
  PatientScope,
  PatientSummary,
} from '../models/doctor-panel';

/** Período da biometria em "yyyy-MM-dd"; ausente, a API usa os 90 dias padrão. */
export interface Period {
  from: string;
  to: string;
}

@Injectable({ providedIn: 'root' })
export class DoctorPanelService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/doctor`;

  listPatients(opts: { scope?: PatientScope; search?: string; pendingOnly?: boolean; page?: number } = {}): Promise<PatientListResponse> {
    let params = new HttpParams();
    if (opts.scope) params = params.set('scope', opts.scope);
    if (opts.search) params = params.set('search', opts.search);
    if (opts.pendingOnly) params = params.set('pendingOnly', 'true');
    if (opts.page) params = params.set('page', String(opts.page));
    return firstValueFrom(this.http.get<PatientListResponse>(`${this.base}/patients`, { params }));
  }

  summary(patientId: string, period?: Period): Promise<PatientSummary> {
    let params = new HttpParams();
    if (period?.from) params = params.set('from', period.from);
    if (period?.to) params = params.set('to', period.to);
    return firstValueFrom(
      this.http.get<PatientSummary>(`${this.base}/patients/${patientId}/summary`, { params }),
    );
  }

  link(patientId: string): Promise<LinkState> {
    return firstValueFrom(this.http.post<LinkState>(`${this.base}/patients/${patientId}/links`, {}));
  }

  transfer(patientId: string): Promise<LinkState> {
    return firstValueFrom(this.http.post<LinkState>(`${this.base}/patients/${patientId}/transfer`, {}));
  }

  notes(patientId: string): Promise<ClinicalNote[]> {
    return firstValueFrom(this.http.get<ClinicalNote[]>(`${this.base}/patients/${patientId}/notes`));
  }

  createNote(patientId: string, body: string): Promise<ClinicalNote> {
    return firstValueFrom(this.http.post<ClinicalNote>(`${this.base}/patients/${patientId}/notes`, { body }));
  }

  updateNote(noteId: string, body: string): Promise<ClinicalNote> {
    return firstValueFrom(this.http.patch<ClinicalNote>(`${this.base}/notes/${noteId}`, { body }));
  }

  deleteNote(noteId: string): Promise<{ deleted: boolean }> {
    return firstValueFrom(this.http.delete<{ deleted: boolean }>(`${this.base}/notes/${noteId}`));
  }

  auditEvents(patientId: string): Promise<AuditEvent[]> {
    const params = new HttpParams().set('patientId', patientId);
    return firstValueFrom(this.http.get<AuditEvent[]>(`${this.base}/audit-events`, { params }));
  }
}
