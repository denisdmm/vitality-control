import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api';
import { CreateMedicationDto, CreateVaccineDto, ExamType, Medication, Vaccine } from '../models/medication-vaccine';

@Injectable({ providedIn: 'root' })
export class MedicationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/medications`;

  list(): Promise<Medication[]> {
    return firstValueFrom(this.http.get<Medication[]>(this.base));
  }

  create(dto: CreateMedicationDto): Promise<Medication> {
    return firstValueFrom(this.http.post<Medication>(this.base, dto));
  }

  remove(id: string): Promise<{ deleted: string; name: string }> {
    return firstValueFrom(this.http.delete<{ deleted: string; name: string }>(`${this.base}/${id}`));
  }
}

@Injectable({ providedIn: 'root' })
export class VaccinesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/vaccines`;

  list(): Promise<Vaccine[]> {
    return firstValueFrom(this.http.get<Vaccine[]>(this.base));
  }

  create(dto: CreateVaccineDto): Promise<Vaccine> {
    return firstValueFrom(this.http.post<Vaccine>(this.base, dto));
  }

  remove(id: string): Promise<{ deleted: string; vaccineName: string }> {
    return firstValueFrom(this.http.delete<{ deleted: string; vaccineName: string }>(`${this.base}/${id}`));
  }
}

@Injectable({ providedIn: 'root' })
export class ExamTypesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/exam-types`;

  list(): Promise<ExamType[]> {
    return firstValueFrom(this.http.get<ExamType[]>(this.base));
  }
}