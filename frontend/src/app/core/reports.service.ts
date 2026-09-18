import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api';
import { ConsolidatedReportResponse, PressureReportResponse } from '../models/user';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/reports`;

  consolidated(from?: string, to?: string): Promise<ConsolidatedReportResponse> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return firstValueFrom(this.http.get<ConsolidatedReportResponse>(`${this.base}/consolidated`, { params }));
  }

  pressure(from?: string, to?: string): Promise<PressureReportResponse> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return firstValueFrom(this.http.get<PressureReportResponse>(`${this.base}/pressure`, { params }));
  }
}
