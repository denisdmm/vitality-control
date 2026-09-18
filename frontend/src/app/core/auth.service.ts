import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api';

export type UserRole = 'PACIENTE' | 'MEDICO' | 'ADMINISTRADOR';

export interface AuthUser {
  id: string;
  name: string;
  fullName: string;
  socialName: string | null;
  email: string | null;
  photoUrl: string | null;
  role: UserRole;
  inactivityTimeout: number | null;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';
const TIMEOUT_KEY = 'inactivityTimeout';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly user = signal<AuthUser | null>(this.loadStoredUser());
  readonly token = signal<string | null>(this.loadStoredToken());
  readonly isAuthed = computed(() => !!this.token());

  async login(name: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${API_BASE}/auth/login`, { name, password }),
    );
    this.applySession(res);
  }

  logout(navigate = true): void {
    this.user.set(null);
    this.token.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TIMEOUT_KEY);
    if (navigate) void this.router.navigate(['/login']);
  }

  private applySession(res: LoginResponse): void {
    this.token.set(res.accessToken);
    this.user.set(res.user);
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    if (res.user.inactivityTimeout) {
      localStorage.setItem(TIMEOUT_KEY, String(res.user.inactivityTimeout));
    } else {
      localStorage.removeItem(TIMEOUT_KEY);
    }
  }

  private loadStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private loadStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}