import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { parseIsoDate } from '../../core/dates';
import { IconComponent } from '../icon.component';

export interface ConsolidatedReading {
  systolic: number;
  diastolic: number;
  pulse?: number;
}

export interface ConsolidatedGlucose {
  value: number;
}

export interface ConsolidatedDay {
  date: string;
  bp?: {
    manha?: ConsolidatedReading;
    tarde?: ConsolidatedReading;
    noite?: ConsolidatedReading;
  } | null;
  glucose?: {
    manha?: ConsolidatedGlucose;
    tarde?: ConsolidatedGlucose;
    noite?: ConsolidatedGlucose;
  } | null;
  weight?: number | null;
}

export interface ConsolidatedIndices {
  bloodPressure?: {
    systolicLimit?: number | null;
    diastolicLimit?: number | null;
  };
  glucose?: {
    preLimit?: number | null;
    diabetesLimit?: number | null;
  };
}

const WEEKDAYS_FULL = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

@Component({
  selector: 'app-health-consolidated-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="mx-auto flex w-[800px] flex-col gap-0 border border-gray-100 bg-white font-sans text-black shadow-sm">
      <header data-report-part="header" class="mb-10 w-full border-b-2 border-primary pb-6 text-center">
        <h1 class="text-2xl font-bold uppercase tracking-tight">MEDIDA DOMICILIAR</h1>
        <h2 class="text-lg font-semibold text-muted-foreground">Consolidado de Saúde</h2>
        <div class="mt-6 space-y-2 text-left text-sm">
          <p><span class="font-bold">Paciente:</span> {{ patientName() }}</p>
          <p><span class="font-bold">Período:</span> {{ periodLabel() }}</p>
          <p class="text-lg font-bold">Peso: {{ lastWeight() != null ? lastWeight() + ' quilos' : '--' }}</p>
        </div>
      </header>

      <div class="w-full overflow-hidden rounded-lg border-2 border-gray-300 text-sm shadow-sm">
        <div data-report-part="table-header" class="flex h-12 items-center bg-gray-100 text-center font-bold">
          <div class="w-[140px] shrink-0 border-r border-gray-300 py-3 uppercase">DATA</div>
          <div class="w-[120px] shrink-0 border-r border-gray-300 py-3 uppercase">MEDIDA</div>
          <div class="grid flex-1 grid-cols-3 text-center">
            <div class="border-r border-gray-300 py-3 uppercase">Manhã</div>
            <div class="border-r border-gray-300 py-3 uppercase">Tarde</div>
            <div class="py-3 uppercase">Noite</div>
          </div>
        </div>

        @for (day of sorted(); track day.date; let idx = $index) {
          <div data-report-part="day-row" class="flex w-full bg-white" [class]="rowClass(idx)">
            <div class="flex w-[140px] shrink-0 flex-col items-center justify-center border-r border-gray-300 bg-gray-50 p-2 text-center text-base font-bold">
              <div>{{ fmtDay(day.date) }}</div>
              <div class="mt-1 text-[10px] font-normal uppercase text-muted-foreground">
                {{ WEEKDAYS_FULL[parseIsoDate(day.date).getDay()] }}
              </div>
            </div>

            <div class="flex flex-1 flex-col">
              <div class="flex min-h-[45px] items-center border-b border-gray-200">
                <div class="flex w-[120px] shrink-0 items-center gap-1 border-r border-gray-300 px-4 py-2 text-[10px] font-black text-blue-700/80">
                  <app-icon name="scale" class="h-3 w-3" /> PESO
                </div>
                <div class="flex-1 py-1 text-center text-lg font-black text-blue-700">
                  {{ day.weight != null ? day.weight + ' kg' : '-' }}
                </div>
              </div>

              <div class="flex min-h-[45px] items-center border-b border-gray-200">
                <div class="flex w-[120px] shrink-0 items-center gap-1 border-r border-gray-300 px-4 py-2 text-[10px] font-black text-amber-700/80">
                  <app-icon name="droplets" class="h-3 w-3" /> GLICEMIA
                </div>
                <div class="grid h-full flex-1 grid-cols-3 items-center text-center">
                  @for (period of periods; track period) {
                    <div class="font-medium" [class]="cellBorder(period)" [class.py-2]="true">
                      {{ glucoseCell(day.glucose?.[period]) }}
                    </div>
                  }
                </div>
              </div>

              <div class="flex min-h-[45px] items-center">
                <div class="flex w-[120px] shrink-0 items-center gap-1 border-r border-gray-300 px-4 py-2 text-[10px] font-black text-red-700/80">
                  <app-icon name="heartPulse" class="h-3 w-3" /> PRESSÃO
                </div>
                <div class="grid h-full flex-1 grid-cols-3 items-center text-center">
                  @for (period of periods; track period) {
                    <div class="font-medium" [class]="cellBorder(period)" [class.py-2]="true">
                      {{ bpCell(day.bp?.[period]) }}
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        } @empty {
          <div class="w-full bg-white py-20 text-center italic text-muted-foreground">
            Nenhum registro encontrado para o período selecionado.
          </div>
        }
      </div>

      <footer data-report-part="footer" class="mt-12 w-full border-t border-dashed pt-12 text-center text-[10px] text-muted-foreground">
        <p>Este relatório consolida medidas domiciliares para acompanhamento clínico. Não substitui o diagnóstico médico.</p>
        <p class="mt-1 font-bold text-primary/60">Central de Vitalidade — Gestão Inteligente de Saúde</p>
      </footer>
    </div>
  `,
})
export class HealthConsolidatedReportComponent {
  readonly patientName = input.required<string>();
  readonly data = input<ConsolidatedDay[]>([]);
  readonly healthIndices = input<ConsolidatedIndices | null>(null);
  readonly periodLabel = input('');

  readonly periods: ('manha' | 'tarde' | 'noite')[] = ['manha', 'tarde', 'noite'];
  readonly WEEKDAYS_FULL = WEEKDAYS_FULL;
  readonly parseIsoDate = parseIsoDate;
  readonly fmtDay = (d: string) => {
    const dt = parseIsoDate(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  readonly sorted = computed(() => [...this.data()].sort((a, b) => b.date.localeCompare(a.date)));

  readonly lastWeight = computed(() => this.sorted().find((d) => d.weight != null)?.weight ?? null);

  rowClass(idx: number): string {
    return idx > 0 ? 'flex w-full bg-white border-t-[3px]' : 'flex w-full bg-white';
  }

  cellBorder(period: string): string {
    return period === 'noite' ? 'py-2 font-medium' : 'border-r border-gray-200 py-2 font-medium';
  }

  bpCell(value?: ConsolidatedReading): string {
    if (!value?.systolic || !value?.diastolic) return '-';
    const bp = this.healthIndices()?.bloodPressure;
    const sLimit = bp?.systolicLimit ? Number(bp.systolicLimit) : 140;
    const dLimit = bp?.diastolicLimit ? Number(bp.diastolicLimit) : 90;
    const isHigh = value.systolic >= sLimit || value.diastolic >= dLimit;
    let text = `${value.systolic}/${value.diastolic}`;
    if (value.pulse) text += ` (${value.pulse})`;
    return isHigh ? `${text} ▲` : text;
  }

  glucoseCell(value?: ConsolidatedGlucose): string {
    if (!value?.value) return '-';
    const g = this.healthIndices()?.glucose || { preLimit: 100, diabetesLimit: 126 };
    const diabetes = value.value >= Number(g.diabetesLimit ?? 126);
    const pre = value.value >= Number(g.preLimit ?? 100) && !diabetes;
    return diabetes || pre ? `${value.value} ▲` : String(value.value);
  }
}