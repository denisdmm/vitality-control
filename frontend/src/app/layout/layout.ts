import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Data, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService, UserRole } from '../core/auth.service';
import { BackService } from '../core/back.service';
import { InactivityService } from '../core/inactivity.service';
import { HealthEntryModalComponent } from '../shared/widgets/health-entry-modal';
import type { NavItem } from '../shared/widgets/nav-links';
import { NavPanelComponent } from './nav-panel';

interface MenuItem extends NavItem {
  roles?: UserRole[];
}

const MENU: MenuItem[] = [
  { path: '/', title: 'Dashboard', exact: true },
  { path: '/exames', title: 'Exames' },
  { path: '/relatorios', title: 'Relatórios' },
  { path: '/pressao', title: 'Pressão' },
  { path: '/glicemia', title: 'Glicemia' },
  { path: '/peso', title: 'Peso e IMC' },
  { path: '/vacinacao', title: 'Vacinação' },
  { path: '/receituario', title: 'Receituário', roles: ['PACIENTE', 'ADMINISTRADOR'] },
  { path: '/campanhas', title: 'Campanhas' },
  { path: '/minha-area', title: 'Minha Área' },
  { path: '/medico/pacientes', title: 'Meus Pacientes', roles: ['MEDICO', 'ADMINISTRADOR'] },
  { path: '/medico/pressao-arterial', title: 'Pressão Pacientes', roles: ['MEDICO', 'ADMINISTRADOR'] },
  { path: '/medico/receituario', title: 'Receituário Pacientes', roles: ['MEDICO', 'ADMINISTRADOR'] },
  { path: '/admin', title: 'Usuários', roles: ['ADMINISTRADOR'], exact: true },
  { path: '/admin/indices', title: 'Índices de Saúde', roles: ['ADMINISTRADOR'] },
];

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, NavPanelComponent, HealthEntryModalComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly inactivity = inject(InactivityService);
  private readonly back = inject(BackService);

  readonly user = this.auth.user;
  readonly isPatient = computed(() => this.user()?.role === 'PACIENTE');
  readonly visibleMenu = computed(() =>
    MENU.filter((item) => !item.roles || item.roles.includes(this.user()?.role ?? 'PACIENTE')),
  );

  /** Menu das telas pequenas: mesmo `MENU`, aberto por drawer. */
  readonly drawerOpen = signal(false);

  /**
   * `data` da rota filha ativada. Sem `pathMatch`, o Router reutiliza a instância
   * do layout entre navegações, então a rota filha é lida a cada fim de navegação
   * em vez de ser observada uma vez só. Antes do primeiro `NavigationEnd` ainda não
   * existe rota filha, e por isso o valor inicial é um objeto vazio.
   */
  private readonly childData = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((): Data => {
        const child = this.route.snapshot.firstChild;
        return child ? child.data : {};
      }),
    ),
    { initialValue: {} as Data },
  );

  readonly pageTitle = computed(() => this.childData()['title'] ?? 'Central de Vitalidade');

  /** Rota segura do botão "Voltar"; ausente em tela de primeiro nível. */
  readonly backTo = computed(() => {
    const target = this.childData()['backTo'];
    return typeof target === 'string' ? target : null;
  });

  constructor() {
    this.inactivity.start();
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  /** Com um diálogo aberto por cima, o `Esc` é do diálogo, não do menu. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.drawerOpen() || document.querySelector('[role="dialog"]')) return;
    this.closeDrawer();
  }

  goBack(): void {
    const fallback = this.backTo();
    if (fallback) this.back.goBack(fallback);
  }

  logout(): void {
    this.auth.logout();
  }
}