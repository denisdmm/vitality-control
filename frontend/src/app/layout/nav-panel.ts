import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AuthUser } from '../core/auth.service';
import { NavLinksComponent, NavItem } from '../shared/widgets/nav-links';

/**
 * Conteúdo do menu (logo, entradas e cartão do usuário). Reaproveitado pelas duas
 * formas do menu: a sidebar fixa do desktop e o drawer das telas pequenas.
 */
@Component({
  selector: 'app-nav-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavLinksComponent],
  template: `
    <div class="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
      <svg
        class="h-8 w-8 shrink-0 text-sidebar-primary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
      </svg>
      <span class="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">Central de Vitalidade</span>
      @if (closable()) {
        <button
          type="button"
          (click)="closed.emit()"
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label="Fechar menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      }
    </div>

    <nav class="flex-1 overflow-y-auto p-3">
      <app-nav-links [items]="items()" (navigated)="navigated.emit()" />
    </nav>

    <div class="border-t border-sidebar-border p-3">
      <div class="flex items-center gap-3 rounded-md px-2 py-2">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground"
        >
          {{ (user()?.fullName || user()?.name || '?').charAt(0).toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ user()?.fullName }}</p>
          <p class="truncate text-xs text-sidebar-foreground/60">{{ user()?.role }}</p>
        </div>
      </div>
    </div>
  `,
  host: { class: 'flex h-full min-h-0 flex-col' },
})
export class NavPanelComponent {
  readonly items = input.required<NavItem[]>();
  readonly user = input<AuthUser | null>(null);
  /** Só o drawer tem botão de fechar. */
  readonly closable = input(false);

  readonly navigated = output<void>();
  readonly closed = output<void>();
}