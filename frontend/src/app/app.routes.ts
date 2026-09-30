import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';
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
        data: { title: 'Detalhes do Exame', backTo: '/exames' },
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
        redirectTo: 'receituario',
        pathMatch: 'full',
      },
      {
        path: 'receituario',
        data: { title: 'Receituário' },
        loadComponent: () => import('./pages/receituario/receituario').then((m) => m.ReceituarioComponent),
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
        redirectTo: 'medico/pacientes',
      },
      {
        path: 'medico/pacientes',
        canActivate: [roleGuard('MEDICO', 'ADMINISTRADOR')],
        data: { title: 'Meus Pacientes' },
        loadComponent: () => import('./pages/medico/pacientes').then((m) => m.MedicoPacientesComponent),
      },
      {
        path: 'medico/pacientes/:patientId/ficha',
        canActivate: [roleGuard('MEDICO', 'ADMINISTRADOR')],
        data: { title: 'Ficha do Paciente', backTo: '/medico/pacientes' },
        loadComponent: () => import('./pages/medico/paciente-ficha').then((m) => m.MedicoPacienteFichaComponent),
      },
      {
        path: 'medico/receituario',
        canActivate: [roleGuard('MEDICO', 'ADMINISTRADOR')],
        data: { title: 'Receituário dos Pacientes' },
        loadComponent: () => import('./pages/medico/receituario').then((m) => m.MedicoReceituarioComponent),
      },
      {
        path: 'medico/pressao-arterial',
        canActivate: [roleGuard('MEDICO', 'ADMINISTRADOR')],
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
        data: { title: 'Índices de Saúde', backTo: '/admin' },
        loadComponent: () => import('./pages/admin/indices').then((m) => m.AdminIndicesComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];