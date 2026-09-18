import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService, UserRole } from '../core/auth.service';
import { InactivityService } from '../core/inactivity.service';
import { HealthEntryModalComponent } from '../shared/widgets/health-entry-modal';

interface MenuItem {
  path: string;
  title: string;
  roles?: UserRole[];
  exact?: boolean;
}

const MENU: MenuItem[] = [
  { path: '/', title: 'Dashboard', exact: true },
  { path: '/exames', title: 'Exames' },
  { path: '/relatorios', title: 'Relatórios' },
  { path: '/pressao', title: 'Pressão' },
  { path: '/glicemia', title: 'Glicemia' },
  { path: '/peso', title: 'Peso e IMC' },
  { path: '/vacinacao', title: 'Vacinação' },
  { path: '/medicamentos', title: 'Medicamentos' },
  { path: '/campanhas', title: 'Campanhas' },
  { path: '/minha-area', title: 'Minha Área' },
  { path: '/medico/pressao-arterial', title: 'Pressão Pacientes', roles: ['MEDICO', 'ADMINISTRADOR'] },
  { path: '/admin', title: 'Usuários', roles: ['ADMINISTRADOR'], exact: true },
  { path: '/admin/indices', title: 'Índices de Saúde', roles: ['ADMINISTRADOR'] },
];

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HealthEntryModalComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class LayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly inactivity = inject(InactivityService);

  readonly user = this.auth.user;
  readonly isPatient = computed(() => this.user()?.role === 'PACIENTE');
  readonly visibleMenu = computed(() =>
    MENU.filter((item) => !item.roles || item.roles.includes(this.user()?.role ?? 'PACIENTE')),
  );

  readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.route.root.firstChild?.snapshot.data['title'] ?? 'Central de Vitalidade'),
    ),
    { initialValue: this.route.root.firstChild?.snapshot.data['title'] ?? 'Central de Vitalidade' },
  );

  constructor() {
    this.inactivity.start();
  }

  logout(): void {
    this.auth.logout();
  }
}