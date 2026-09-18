import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VitalsService } from '../../core/vitals.service';
import { SharedDataService } from '../../core/shared-data.service';
import { daysAgo, fmtIsoShort, toYMD } from '../../core/dates';
import type { VitalScore } from '../../models/vital';
import { ButtonComponent } from '../ui/button';
import { IconComponent } from '../icon.component';
import { LineChartComponent, LineChartOptions } from '../ui/chart';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../ui/card';
import { themeColor } from '../../core/theme';

function roundAvg(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

interface GlucoseThreshold {
  preLimit: number;
  diabetesLimit: number;
}

@Component({
  selector: 'app-glucose-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent, ButtonComponent, IconComponent, LineChartComponent, RouterLink],
  template: `
    <app-card class="flex h-full flex-col">
      <app-card-header class="flex flex-row items-start justify-between">
        <div class="flex items-center gap-3">
          <app-icon name="droplets" class="h-6 w-6 text-primary" />
          <div>
            <app-card-title>Glicemia</app-card-title>
            <app-card-description>Média diária (mg/dL)</app-card-description>
          </div>
        </div>
        <a app-button size="sm" variant="outline" routerLink="/glicemia">Ver Tudo</a>
      </app-card-header>
      <app-card-content class="flex flex-1 flex-col gap-4">
        @if (lastValue() !== null) {
          <div class="flex items-center justify-center rounded-lg bg-muted/50 p-4">
            <div class="text-center">
              <p class="text-sm font-semibold uppercase text-muted-foreground">Última Medição</p>
              <div class="mt-1 flex items-center justify-center gap-2">
                @if (lastValue()! >= thresholds().diabetesLimit) {
                  <app-icon name="skull" class="h-6 w-6 text-destructive" />
                } @else if (lastValue()! >= thresholds().preLimit) {
                  <app-icon name="triangleAlert" class="h-6 w-6 text-amber-500" />
                }
                <span [class]="lastValueClass()">
                  {{ lastValue() }} mg/dL
                </span>
              </div>
            </div>
          </div>
        }
        @if (readings().length > 0) {
          <div class="h-[200px] w-full">
            <app-line-chart [options]="chartOptions()" />
          </div>
        } @else {
          <div class="flex flex-1 flex-col items-center justify-center py-10 text-muted-foreground">
            <app-icon name="trendingUp" class="mb-2 h-8 w-8 opacity-20" />
            <p class="text-sm">Sem dados recentes.</p>
          </div>
        }
      </app-card-content>
    </app-card>
  `,
})
export class GlucoseLogComponent {
  private readonly vitals = inject(VitalsService);
  private readonly shared = inject(SharedDataService);

  readonly readings = signal<VitalScore[]>([]);
  readonly thresholds = signal<GlucoseThreshold>({ preLimit: 100, diabetesLimit: 126 });

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const sharedData = await this.shared.get();
      this.thresholds.set({
        preLimit: Number(sharedData.glucosePreLimit ?? 100),
        diabetesLimit: Number(sharedData.glucoseDiabetesLimit ?? 126),
      });
    } catch {
      /* mantém padrão */
    }
    try {
      const rows = await this.vitals.list(toYMD(daysAgo(30)), toYMD(new Date()));
      const withGlucose = rows.filter((r) => {
        const g = r.glucosePeriods;
        return g && (g.manha?.value || g.tarde?.value || g.noite?.value);
      });
      withGlucose.sort((a, b) => a.date.localeCompare(b.date));
      this.readings.set(withGlucose.slice(-30));
    } catch {
      this.readings.set([]);
    }
  }

  readonly chartData = () =>
    this.readings()
      .map((r) => {
        const g = r.glucosePeriods || {};
        const all = [g.manha, g.tarde, g.noite].filter((p) => p && p.value);
        if (!all.length) return null;
        const avg = roundAvg(all.map((p) => p!.value!));
        return { label: fmtIsoShort(r.date), full: fmtIsoShort(r.date), value: avg };
      })
      .filter((d): d is NonNullable<typeof d> => !!d);

  readonly chartOptions = (): LineChartOptions => {
    const data = this.chartData();
    return {
      labels: data.map((d) => d.label),
      fullLabels: data.map((d) => d.full),
      height: 200,
      ySuggestedMin: 60,
      series: [{ label: 'Glicemia (mg/dL)', color: themeColor('primary'), data: data.map((d) => d.value) }],
      compressed: true,
    };
  };

  readonly lastValue = computed(() => {
    const rows = this.readings();
    if (!rows.length) return null;
    const r = rows[rows.length - 1];
    const g = r.glucosePeriods || {};
    const p = g.noite ?? g.tarde ?? g.manha;
    return p?.value ?? null;
  });

  readonly lastValueClass = computed(() => {
    const v = this.lastValue();
    if (v === null) return '';
    if (v >= this.thresholds().diabetesLimit) return 'text-3xl font-bold text-destructive';
    if (v >= this.thresholds().preLimit) return 'text-3xl font-bold text-amber-600';
    return 'text-3xl font-bold text-primary';
  });
}