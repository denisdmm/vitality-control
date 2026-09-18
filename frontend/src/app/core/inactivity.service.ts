import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';

const DEFAULT_TIMEOUT = 60_000;

@Injectable({ providedIn: 'root' })
export class InactivityService {
  private readonly auth = inject(AuthService);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const reset = () => this.start();
    ['mousemove', 'keydown', 'click', 'scroll'].forEach((ev) =>
      window.addEventListener(ev, reset, { passive: true }),
    );
  }

  start(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.auth.logout(), this.readDuration());
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private readDuration(): number {
    const stored = localStorage.getItem('inactivityTimeout');
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT;
  }
}