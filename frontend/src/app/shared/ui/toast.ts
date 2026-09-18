import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-toaster',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          [class]="toast.variant === 'destructive' ? 'border-destructive/50 bg-destructive text-destructive-foreground' : 'border bg-background text-foreground'"
          class="pointer-events-auto relative flex w-full items-start justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-8 shadow-lg"
          (click)="dismiss(toast.id)"
        >
          @if (toast.variant === 'destructive') {
            <app-icon name="triangleAlert" class="h-4 w-4 shrink-0 mt-0.5" />
          } @else {
            <app-icon name="info" class="h-4 w-4 shrink-0 mt-0.5" />
          }
          <div class="flex-1">
            @if (toast.title) {
              <div class="text-sm font-semibold leading-none">{{ toast.title }}</div>
            }
            @if (toast.description) {
              <div class="mt-1 text-sm opacity-90">{{ toast.description }}</div>
            }
          </div>
          <button
            type="button"
            class="absolute right-2 top-2 rounded-md p-1 hover:bg-muted/50"
            (click)="dismiss(toast.id); $event.stopPropagation()"
          >
            <span class="sr-only">Fechar</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToasterComponent {
  readonly toasts = inject(ToastService);

  dismiss(id: number): void {
    this.toasts.dismiss(id);
  }
}