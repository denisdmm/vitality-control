import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VitalsService } from '../../core/vitals.service';
import { UsersService } from '../../core/users.service';
import { daysAgo, toYMD } from '../../core/dates';
import { ButtonComponent } from '../ui/button';
import { IconComponent } from '../icon.component';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../ui/card';

interface WeightEntry {
  date: string;
  weight: number;
}

interface ImcCategory {
  label: string;
  color: string;
}

function getImcCategory(val: number): ImcCategory {
  if (val < 18.5) return { label: 'Abaixo do peso', color: 'text-blue-600' };
  if (val < 25) return { label: 'Normal', color: 'text-emerald-600' };
  if (val < 30) return { label: 'Sobrepeso', color: 'text-amber-600' };
  if (val < 35) return { label: 'Obesidade 1', color: 'font-bold text-orange-600' };
  return { label: 'Obesidade 2+', color: 'font-bold text-destructive' };
}

@Component({
  selector: 'app-weight-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent, ButtonComponent, IconComponent, RouterLink],
  template: `
    <app-card class="flex h-full flex-col">
      <app-card-header class="flex flex-row items-start justify-between">
        <div class="flex items-center gap-3">
          <app-icon name="scale" class="h-6 w-6 text-primary" />
          <div>
            <app-card-title>Peso e IMC</app-card-title>
            <app-card-description>Última avaliação</app-card-description>
          </div>
        </div>
        <a app-button size="sm" variant="outline" routerLink="/peso">Ver Tudo</a>
      </app-card-header>
      <app-card-content class="flex flex-1 flex-col justify-center">
        @if (lastEntry()) {
          <div class="space-y-6">
            <div class="flex items-end justify-around">
              <div class="text-center">
                <p class="text-xs uppercase text-muted-foreground">Peso</p>
                <p class="text-3xl font-bold">{{ lastEntry()!.weight }} <span class="text-sm font-normal">kg</span></p>
              </div>
              @if (imc() !== null) {
                <div class="text-center">
                  <p class="text-xs uppercase text-muted-foreground">IMC</p>
                  <p class="text-3xl font-bold">{{ imc()!.toFixed(1) }}</p>
                </div>
              }
            </div>
            @if (imc() !== null) {
              <div [class]="'border p-2 text-center rounded-md bg-muted/30 ' + category().color">
                {{ category().label }}
              </div>
            }
            @if (!height()) {
              <p class="flex items-center justify-center gap-1 text-[10px] text-center text-muted-foreground">
                <app-icon name="info" class="h-3 w-3" /> Defina sua altura no perfil para ver o IMC.
              </p>
            }
          </div>
        } @else {
          <div class="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <app-icon name="scale" class="mb-2 h-8 w-8 opacity-20" />
            <p class="text-sm">Nenhum peso registrado.</p>
          </div>
        }
      </app-card-content>
    </app-card>
  `,
})
export class WeightLogComponent {
  private readonly vitals = inject(VitalsService);
  private readonly users = inject(UsersService);

  readonly entries = signal<WeightEntry[]>([]);
  readonly height = signal<number | null>(null);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const me = await this.users.me();
      this.height.set(me.height ?? null);
    } catch {
      /* sem altura */
    }
    try {
      const rows = await this.vitals.list(toYMD(daysAgo(30)), toYMD(new Date()));
      const entries = rows
        .filter((r) => r.weight != null)
        .map((r) => ({ date: r.date, weight: r.weight as number }));
      entries.sort((a, b) => a.date.localeCompare(b.date));
      this.entries.set(entries.slice(-10));
    } catch {
      this.entries.set([]);
    }
  }

  readonly lastEntry = computed(() => {
    const es = this.entries();
    return es.length ? es[es.length - 1] : null;
  });

  readonly imc = computed(() => {
    const last = this.lastEntry();
    const h = this.height();
    if (!last || !h) return null;
    return last.weight / (h * h);
  });

  readonly category = computed(() => {
    const imc = this.imc();
    return getImcCategory(imc ?? 0);
  });
}