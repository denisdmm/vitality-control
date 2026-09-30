import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthed()) return true;
  return inject(Router).createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthed()) return inject(Router).createUrlTree(['']);
  return true;
};

/** Fecha a área do médico no roteador; o menu sozinho não impedia /medico/* na URL. */
export const roleGuard = (...roles: UserRole[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthed()) return router.createUrlTree(['/login']);
    if (roles.includes(auth.user()?.role ?? 'PACIENTE')) return true;
    return router.createUrlTree(['']);
  };
};
