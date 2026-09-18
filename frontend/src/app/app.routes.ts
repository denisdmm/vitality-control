import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { LayoutComponent } from './layout/layout';
import { LoginComponent } from './pages/login/login';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { title: 'Dashboard' },
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'exames',
        data: { title: 'Exames' },
        loadComponent: () => import('./pages/exames/exames').then((m) => m.ExamesComponent),
      },
      {
        path: 'exames/:id',
        data: { title: 'Detalhes do Exame' },
        loadComponent: () => import('./pages/exames/exames-detail').then((m) => m.ExamesDetailComponent),
      },
      {
        path: 'relatorios',
        data: { title: 'Relatórios' },
        loadComponent: () => import('./pages/relatorios/relatorios').then((m) => m.RelatoriosComponent),
      },
      {
        path: 'pressao',
        data: { title: 'Pressão Arterial' },
        loadComponent: () => import('./pages/pressao-arterial/pressao').then((m) => m.PressaoArterialComponent),
      },
      {
        path: 'glicemia',
        data: { title: 'Glicemia' },
        loadComponent: () => import('./pages/glicemia/glicemia').then((m) => m.GlicemiaComponent),
      },
      {
        path: 'peso',
        data: { title: 'Peso e IMC' },
        loadComponent: () => import('./pages/peso/peso').then((m) => m.PesoComponent),
      },
      {
        path: 'vacinacao',
        data: { title: 'Vacinação' },
        loadComponent: () => import('./shared/widgets/vaccination-wallet').then((m) => m.VaccinationWalletComponent),
      },
      {
        path: 'medicamentos',
        data: { title: 'Medicamentos' },
        loadComponent: () => import('./shared/widgets/medication-tracker').then((m) => m.MedicationTrackerComponent),
      },
      {
        path: 'campanhas',
        data: { title: 'Campanhas' },
        loadComponent: () => import('./shared/widgets/public-campaigns').then((m) => m.PublicCampaignsComponent),
      },
      {
        path: 'minha-area',
        data: { title: 'Minha Área' },
        loadComponent: () => import('./pages/minha-area/minha-area').then((m) => m.MinhaAreaComponent),
      },
      {
        path: 'medico',
        pathMatch: 'full',
        redirectTo: 'medico/pressao-arterial',
      },
      {
        path: 'medico/pressao-arterial',
        data: { title: 'Pressão dos Pacientes' },
        loadComponent: () => import('./pages/medico/pressao-arterial').then((m) => m.MedicoPressaoArterialComponent),
      },
      {
        path: 'admin',
        data: { title: 'Gerenciamento de Usuários' },
        loadComponent: () => import('./pages/admin/users').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'admin/indices',
        data: { title: 'Índices de Saúde' },
        loadComponent: () => import('./pages/admin/indices').then((m) => m.AdminIndicesComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];