import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import type { VitalScore } from '../../models/vital';
import { fmtIsoShort } from '../../core/dates';
import { themeColor } from '../../core/theme';
import { LineChartComponent, LineChartOptions } from '../ui/chart';

export interface BPIndices {
  systolicIdeal?: number | null;
  diastolicIdeal?: number | null;
  systolicLimit?: number | null;
  diastolicLimit?: number | null;
}

interface Summary {
  avgSystolic: number;
  avgDiastolic: number;
  highest: { value: { systolic: number; diastolic: number }; date: string; period: string } | null;
  lowest: { value: { systolic: number; diastolic: number }; date: string; period: string } | null;
}

function roundAvg(values: number[]): number {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
}

export function readingWithPulse(reading: { systolic?: number; diastolic?: number; pulse?: number } | null | undefined): string {
  if (!reading?.systolic || !reading?.diastolic) return '-';
  let text = `${reading.systolic}/${reading.diastolic}`;
  if (reading.pulse) text += ` (${reading.pulse})`;
  return text;
}

@Component({
  selector: 'app-blood-pressure-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LineChartComponent],
  template: `
    <div class="mx-auto w-[794px] bg-white font-sans text-black">
      <header class="mb-8 px-8 pt-8 text-center">
        <div class="mb-2 flex items-center justify-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               class="h-8 w-8 text-red-600">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
          </svg>
          <h1 class="text-2xl font-bold">MEDIDA DOMICILIAR DA PRESSÃO ARTERIAL</h1>
        </div>
        <p class="text-sm text-gray-700">
          Medir a pressão de manhã e à noite, antes de tomar as medicações da pressão (se houver).
        </p>
      </header>

      <div class="mb-8 px-8">
        <span class="font-semibold">Paciente:</span> {{ patientName() }}
      </div>

      <div class="mb-8 border-y border-gray-300 px-8 py-4 text-center">
        <div class="flex items-baseline justify-center gap-2 text-lg">
          <span class="font-bold">Média do Período:</span>
          <span class="text-gray-600">Sistólica</span>
          <span class="text-xl font-bold">{{ avgSystolic() > 0 ? avgSystolic() : '-' }}</span>
          <span class="text-gray-500">/</span>
          <span class="text-gray-600">Diastólica</span>
          <span class="text-xl font-bold">{{ avgDiastolic() > 0 ? avgDiastolic() : '-' }}</span>
        </div>
        @if (highest() && lowest()) {
          <div class="mt-2 flex items-center justify-center gap-4 text-sm text-gray-600">
            <span>
              <span class="font-semibold">Maior:</span> {{ highest()!.value.systolic }}/{{ highest()!.value.diastolic }}
              <span class="text-xs">({{ fmtIsoShort(highest()!.date) }} - {{ highest()!.period }})</span>
            </span>
            <span class="text-gray-300">|</span>
            <span>
              <span class="font-semibold">Menor:</span> {{ lowest()!.value.systolic }}/{{ lowest()!.value.diastolic }}
              <span class="text-xs">({{ fmtIsoShort(lowest()!.date) }} - {{ lowest()!.period }})</span>
            </span>
          </div>
        }
      </div>

      @if (sorted().length > 0) {
        <div class="mx-8 overflow-hidden rounded-lg border-2 border-gray-400">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 border-gray-300 bg-gray-100">
                <th class="border-r border-gray-300 px-3 py-2 text-center font-semibold text-black">Data</th>
                <th class="border-r border-gray-300 px-3 py-2 text-center font-semibold text-black">Manhã (S/D)</th>
                <th class="border-r border-gray-300 px-3 py-2 text-center font-semibold text-black">Tarde (S/D)</th>
                <th class="px-3 py-2 text-center font-semibold text-black">Noite (S/D)</th>
              </tr>
            </thead>
            <tbody>
              @for (r of sorted(); track r.date; let i = $index) {
                <tr [class]="i % 2 === 0 ? 'bg-white' : 'bg-gray-50'">
                  <td class="border-r border-gray-300 px-3 py-2 text-center align-middle font-mono">
                    {{ fmtIsoShort(r.date) }}
                  </td>
                  <td class="border-r border-gray-300 px-3 py-2 text-center align-middle font-mono">
                    {{ cell(r.bloodPressurePeriods?.manha) }}
                  </td>
                  <td class="border-r border-gray-300 px-3 py-2 text-center align-middle font-mono">
                    {{ cell(r.bloodPressurePeriods?.tarde) }}
                  </td>
                  <td class="px-3 py-2 text-center align-middle font-mono">
                    {{ cell(r.bloodPressurePeriods?.noite) }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mt-12 border-t-2 border-dashed border-gray-400 px-8 pb-8 pt-8">
          <h2 class="mb-6 text-center text-xl font-bold">Resumo Gráfico (Média Diária)</h2>
          <div class="h-[350px] w-full text-xs">
            <app-line-chart [options]="chartOptions()" />
          </div>
        </div>
      } @else {
        <div class="p-8 text-center text-gray-600">
          <p>Nenhum registro de pressão encontrado para este período.</p>
        </div>
      }
    </div>
  `,
})
export class BloodPressureReportComponent {
  readonly patientName = input.required<string>();
  readonly readings = input<VitalScore[]>([]);
  readonly healthIndices = input<BPIndices | null>(null);

  readonly fmtIsoShort = fmtIsoShort;

  readonly sorted = computed(() =>
    [...this.readings()]
      .filter((r) => r.bloodPressurePeriods)
      .sort((a, b) => a.date.localeCompare(b.date)),
  );

  readonly summary = computed<Summary>(() => {
    const systs: number[] = [];
    const diasts: number[] = [];
    let highest: Summary['highest'] = null;
    let lowest: Summary['lowest'] = null;
    const periods: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

    for (const day of this.readings()) {
      const bp = day.bloodPressurePeriods;
      if (!bp) continue;
      for (const [key, label] of Object.entries(periods)) {
        const reading = bp[key as 'manha' | 'tarde' | 'noite'];
        if (reading?.systolic && reading?.diastolic) {
          systs.push(reading.systolic);
          diasts.push(reading.diastolic);
          if (!highest || reading.systolic > highest.value.systolic) {
            highest = { value: { systolic: reading.systolic, diastolic: reading.diastolic }, date: day.date, period: label };
          }
          if (!lowest || reading.systolic < lowest.value.systolic) {
            lowest = { value: { systolic: reading.systolic, diastolic: reading.diastolic }, date: day.date, period: label };
          }
        }
      }
    }
    return {
      avgSystolic: roundAvg(systs),
      avgDiastolic: roundAvg(diasts),
      highest,
      lowest,
    };
  });

  readonly avgSystolic = computed(() => this.summary().avgSystolic);
  readonly avgDiastolic = computed(() => this.summary().avgDiastolic);
  readonly highest = computed(() => this.summary().highest);
  readonly lowest = computed(() => this.summary().lowest);

  readonly chartData = computed(() =>
    this.sorted().map((r) => {
      const bp = r.bloodPressurePeriods || {};
      const all = [bp.manha, bp.tarde, bp.noite].filter((p) => p?.systolic && p?.diastolic);
      if (!all.length) return null;
      const systs = all.map((p) => p!.systolic!);
      const diasts = all.map((p) => p!.diastolic!);
      const pulses = all.map((p) => p?.pulse).filter((v): v is number => !!v);
      return {
        label: fmtIsoShort(r.date),
        syst: roundAvg(systs),
        dias: roundAvg(diasts),
        pulse: roundAvg(pulses),
      };
    }).filter((d): d is NonNullable<typeof d> => !!d),
  );

  readonly chartOptions = (): LineChartOptions => {
    const data = this.chartData();
    return {
      labels: data.map((d) => d.label),
      height: 350,
      compressed: true,
      xRotate: -45,
      xFontSize: 10,
      ySuggestedMin: 40,
      series: [
        { label: 'Sistólica', color: themeColor('chart-1'), data: data.map((d) => d.syst) },
        { label: 'Diastólica', color: themeColor('chart-2'), data: data.map((d) => d.dias) },
        { label: 'Pulso', color: themeColor('chart-4'), data: data.map((d) => d.pulse) },
      ],
    };
  };

  cell(reading: { systolic?: number; diastolic?: number; pulse?: number } | null | undefined): string {
    return readingWithPulse(reading);
  }
}