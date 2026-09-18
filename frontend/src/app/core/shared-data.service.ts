import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api';
import { SharedData, UpdateSharedDataDto } from '../models/medication-vaccine';

@Injectable({ providedIn: 'root' })
export class SharedDataService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/shared-data`;

  get(): Promise<SharedData> {
    return firstValueFrom(this.http.get<SharedData>(this.base));
  }

  update(dto: UpdateSharedDataDto): Promise<SharedData> {
    return firstValueFrom(this.http.put<SharedData>(this.base, dto));
  }
}
