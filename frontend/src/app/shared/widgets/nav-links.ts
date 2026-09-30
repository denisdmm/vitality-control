import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  path: string;
  title: string;
  exact?: boolean;
}

/**
 * Lista de navegação, usada pelas duas formas do menu (sidebar fixa e drawer).
 * A lista continua sendo uma só, em `layout.ts`.
 */
@Component({
  selector: 'app-nav-links',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    @for (item of items(); track item.path) {
      <a
        [routerLink]="item.path"
        routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        [routerLinkActiveOptions]="{ exact: item.exact === true }"
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        (click)="navigated.emit()"
      >
        {{ item.title }}
      </a>
    }
  `,
  host: { class: 'flex flex-col gap-1' },
})
export class NavLinksComponent {
  readonly items = input.required<NavItem[]>();
  /** O drawer fecha ao navegar; no sidebar fixo o evento é ignorado. */
  readonly navigated = output<void>();
}