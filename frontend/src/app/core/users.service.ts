import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api';
import { MeResponse, UpdateMeDto, PublicUser } from '../models/user';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/users`;

  me(): Promise<MeResponse> {
    return firstValueFrom(this.http.get<MeResponse>(`${this.base}/me`));
  }

  updateMe(dto: UpdateMeDto): Promise<PublicUser> {
    return firstValueFrom(this.http.patch<PublicUser>(`${this.base}/me`, dto));
  }

  findAll(): Promise<PublicUser[]> {
    return firstValueFrom(this.http.get<PublicUser[]>(this.base));
  }

  findOne(id: string): Promise<PublicUser> {
    return firstValueFrom(this.http.get<PublicUser>(`${this.base}/${id}`));
  }

  create(dto: Record<string, unknown>): Promise<PublicUser> {
    return firstValueFrom(this.http.post<PublicUser>(this.base, dto));
  }

  update(id: string, dto: Record<string, unknown>): Promise<PublicUser> {
    return firstValueFrom(this.http.patch<PublicUser>(`${this.base}/${id}`, dto));
  }

  remove(id: string): Promise<{ deleted: string }> {
    return firstValueFrom(this.http.delete<{ deleted: string }>(`${this.base}/${id}`));
  }
}
