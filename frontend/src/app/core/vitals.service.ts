import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api';
import {
  BloodPressureDay,
  GlucoseDay,
  VitalScore,
  VitalsDailyPayload,
} from '../models/vital';
import { AdminPatient, PressureOfPatientResponse } from '../models/user';

@Injectable({ providedIn: 'root' })
export class VitalsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/vitals`;

  list(from?: string, to?: string): Promise<VitalScore[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return firstValueFrom(this.http.get<VitalScore[]>(this.base, { params }));
  }

  day(date: string): Promise<VitalScore | null> {
    return firstValueFrom(this.http.get<VitalScore | null>(`${this.base}/${date}`));
  }

  /** Registro único de sinais vitais (PA + glicemia + peso). */
  saveDaily(payload: VitalsDailyPayload): Promise<VitalScore> {
    return firstValueFrom(this.http.put<VitalScore>(`${this.base}/daily`, payload));
  }

  bloodPressure(date: string, dto: BloodPressureDay): Promise<VitalScore> {
    return firstValueFrom(this.http.put<VitalScore>(`${this.base}/blood-pressure/${date}`, dto));
  }

  glucose(date: string, dto: GlucoseDay): Promise<VitalScore> {
    return firstValueFrom(this.http.put<VitalScore>(`${this.base}/glucose/${date}`, dto));
  }

  weight(date: string, weight: number): Promise<VitalScore> {
    return firstValueFrom(this.http.put<VitalScore>(`${this.base}/weight/${date}`, { weight }));
  }

  remove(date: string): Promise<{ deleted: string }> {
    return firstValueFrom(this.http.delete<{ deleted: string }>(`${this.base}/${date}`));
  }

  /** Médico: pacientes vinculados. */
  patients(): Promise<AdminPatient[]> {
    return firstValueFrom(this.http.get<AdminPatient[]>(`${this.base}/patients`));
  }

  /** Médico: pressão de um paciente vinculado. */
  pressureOfPatient(patientId: string): Promise<PressureOfPatientResponse> {
    return firstValueFrom(this.http.get<PressureOfPatientResponse>(`${this.base}/pressure/${patientId}`));
  }
}