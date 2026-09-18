import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'default' | 'destructive';

export interface Toast {
  id: number;
  title?: string;
  description?: string;
  variant: ToastVariant;
}

function highestId(toasts: Toast[]) {
  return toasts.reduce((max, t) => Math.max(max, t.id), 0);
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  toast(opts: { title?: string; description?: string; variant?: ToastVariant; duration?: number }): void {
    const id = highestId(this.toasts()) + 1;
    this.toasts.update((ts) => [...ts, { id, variant: 'default', ...opts } satisfies Toast]);
    window.setTimeout(() => this.dismiss(id), opts.duration ?? 5000);
  }

  success(title?: string, description?: string): void {
    this.toast({ title, description, variant: 'default' });
  }

  error(title?: string, description?: string): void {
    this.toast({ title, description, variant: 'destructive' });
  }

  dismiss(id: number): void {
    this.toasts.update((ts) => ts.filter((t) => t.id !== id));
  }
}