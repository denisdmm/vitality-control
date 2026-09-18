import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api';
import {
  CreateHealthRecordDto,
  CreateSubItemDto,
  HealthRecord,
  SubItem,
  UpdateHealthRecordDto,
} from '../models/health-record';

@Injectable({ providedIn: 'root' })
export class HealthRecordsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/health-records`;

  list(): Promise<HealthRecord[]> {
    return firstValueFrom(this.http.get<HealthRecord[]>(this.base));
  }

  create(dto: CreateHealthRecordDto): Promise<HealthRecord> {
    return firstValueFrom(this.http.post<HealthRecord>(this.base, dto));
  }

  findOne(id: string): Promise<HealthRecord> {
    return firstValueFrom(this.http.get<HealthRecord>(`${this.base}/${id}`));
  }

  update(id: string, dto: UpdateHealthRecordDto): Promise<HealthRecord> {
    return firstValueFrom(this.http.patch<HealthRecord>(`${this.base}/${id}`, dto));
  }

  remove(id: string): Promise<{ deleted: string; name: string }> {
    return firstValueFrom(this.http.delete<{ deleted: string; name: string }>(`${this.base}/${id}`));
  }

  addSubItem(id: string, dto: CreateSubItemDto): Promise<SubItem> {
    return firstValueFrom(this.http.post<SubItem>(`${this.base}/${id}/sub-items`, dto));
  }

  updateSubItem(id: string, subId: string, dto: Partial<CreateSubItemDto>): Promise<SubItem> {
    return firstValueFrom(this.http.patch<SubItem>(`${this.base}/${id}/sub-items/${subId}`, dto));
  }

  removeSubItem(id: string, subId: string): Promise<{ deleted: string }> {
    return firstValueFrom(this.http.delete<{ deleted: string }>(`${this.base}/${id}/sub-items/${subId}`));
  }
}