import { Location } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationStart, Router } from '@angular/router';

/**
 * "Voltar" do header. Usa o histórico do navegador, com a rota segura da própria
 * tela como piso: em acesso direto por URL ou em aba nova não há histórico
 * interno, e `Location.back()` tiraria o usuário da aplicação.
 */
@Injectable({ providedIn: 'root' })
export class BackService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  /** Navegações internas concluídas desde o carregamento; 0 no carregamento inicial. */
  private depth = 0;
  private loaded = false;

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        // A primeira navegação é a que monta a tela: não é histórico do usuário.
        if (this.loaded) this.depth++;
      } else if (event instanceof NavigationEnd) {
        this.loaded = true;
      } else if (event instanceof NavigationCancel) {
        // Redirect de guard não chega ao destino: o histórico continua onde estava.
        this.depth = Math.max(0, this.depth - 1);
      }
    });
  }

  goBack(fallback: string): void {
    if (this.depth === 0) {
      void this.router.navigateByUrl(fallback);
      return;
    }
    this.location.back();
  }
}