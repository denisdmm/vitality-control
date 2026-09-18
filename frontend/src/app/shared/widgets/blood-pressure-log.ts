import { Component, ChangeDetectionStrategy, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { VitalsService } from '../../core/vitals.service';
import { daysAgo, fmtIsoShort, fmtShort, toYMD } from '../../core/dates';
import type { DateRange } from '../../core/dates';
import type { PeriodName, VitalScore } from '../../models/vital';
import { ButtonComponent } from '../ui/button';
import { DialogComponent } from '../ui/dialog';
import { SelectComponent, SelectOption } from '../ui/select';
import { PopoverComponent } from '../ui/popover';
import { CalendarComponent } from '../ui/calendar';
import { InputComponent, LabelComponent } from '../ui/input';
import { IconComponent } from '../icon.component';
import { LineChartComponent, LineChartOptions } from '../ui/chart';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../ui/card';

const PERIOD_OPTIONS: SelectOption[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
];

function roundAvg(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

@Component({
  selector: 'app-blood-pressure-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent, ButtonComponent, DialogComponent, SelectComponent, PopoverComponent, CalendarComponent, InputComponent, LabelComponent, IconComponent, LineChartComponent],
  template: `
    <app-card class="flex h-full flex-col">
      <app-card-header class="flex flex-col items-start gap-4">
        <div class="flex w-full flex-row items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <app-icon name="heartPulse" class="h-6 w-6 text-primary" />
            <div>
              <app-card-title>Pressão Arterial</app-card-title>
              <app-card-description class="hidden sm:block">Média diária dos últimos 30 dias</app-card-description>
            </div>
          </div>
          <button app-button size="sm" class="w-full md:w-auto" (click)="open.set(true)">
            <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
            Adicionar
          </button>
        </div>
      </app-card-header>

      <app-card-content class="flex flex-1 flex-col gap-4">
        @if (chartData().length > 0 && readings().length > 0) {
          <div class="h-[300px] w-full pt-4">
            <app-line-chart [options]="chartOptions()" />
          </div>
        } @else {
          <div class="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <app-icon name="trendingUp" class="mb-4 h-12 w-12" />
            <p class="font-medium">Nenhuma medição registrada</p>
            <p class="text-sm">Clique em "Adicionar" para começar.</p>
          </div>
        }
      </app-card-content>
    </app-card>

    <app-dialog [open]="open()" (close)="close()">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Nova Medição de Pressão</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Insira os valores para o período e data. Registros existentes para o mesmo período no mesmo dia serão sobrescritos.
        </p>
      </div>
      <div class="grid gap-4 px-6">
        <div>
          <label app-label class="mb-2 block text-sm font-medium">Data</label>
          <app-popover [open]="calOpen()" (openChange)="calOpen.set($event)">
            <button app-button variant="outline" slot="trigger" class="w-full justify-start text-left font-normal">
              <app-icon name="calendar" class="mr-2 h-4 w-4" />
              {{ fmtLongLabel() }}
            </button>
            <div slot="panel" class="p-0">
              <app-calendar mode="single" [value]="dateRange()" (valueChange)="onPickDate($event)" />
            </div>
          </app-popover>
        </div>
        <div>
          <label app-label class="mb-2 block text-sm font-medium">Período</label>
          <app-select [options]="periodOptions" [placeholder]="'Selecione o período do dia'" [(value)]="period" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label app-label class="mb-2 block text-sm font-medium">Sistólica (mmHg)</label>
            <input app-input class="bg-muted" placeholder="ex: 120" type="number" [value]="systolic()" (input)="onSystolic(inputValue($event))" />
          </div>
          <div>
            <label app-label class="mb-2 block text-sm font-medium">Diastólica (mmHg)</label>
            <input app-input #dias class="bg-muted" placeholder="ex: 80" type="number" [value]="diastolic()" (input)="onDiastolic(inputValue($event))" />
          </div>
        </div>
        <div>
          <label app-label class="mb-2 block text-sm font-medium">Pulso (bpm)</label>
          <input app-input #pulso class="bg-muted" placeholder="ex: 70" type="number" [value]="pulse()" (input)="pulse.set(inputValue($event))" />
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="close()">Cancelar</button>
        <button app-button (click)="addReading()">Salvar</button>
      </div>
    </app-dialog>
  `,
})
export class BloodPressureLogComponent {
  private readonly vitals = inject(VitalsService);
  private readonly toast = inject(ToastService);

  readonly readings = signal<VitalScore[]>([]);
  readonly open = signal(false);
  readonly calOpen = signal(false);
  readonly period = signal<PeriodName | ''>('');
  readonly systolic = signal('');
  readonly diastolic = signal('');
  readonly pulse = signal('');
  readonly date = signal<Date>(new Date());

  readonly periodOptions = PERIOD_OPTIONS;
  readonly inputValue = (e: Event) => (e.target as HTMLInputElement).value;
  readonly dateRange = () => ({ from: this.date(), to: undefined }) as DateRange | null;
  readonly fmtLongLabel = () => fmtShort(this.date());

  readonly diasEl = viewChild<ElementRef<HTMLInputElement>>('dias');
  readonly pulsoEl = viewChild<ElementRef<HTMLInputElement>>('pulso');

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const from = toYMD(daysAgo(30));
      const to = toYMD(new Date());
      const rows = await this.vitals.list(from, to);
      rows.sort((a, b) => a.date.localeCompare(b.date));
      this.readings.set(rows);
    } catch {
      this.readings.set([]);
    }
  }

  readonly chartData = (): { label: string; full: string; syst: number; dias: number; pulse: number }[] =>
    this.readings()
      .map((r) => {
        const bp = r.bloodPressurePeriods ?? {};
        const all = [bp.manha, bp.tarde, bp.noite].filter((p) => p && p.systolic && p.diastolic);
        if (!all.length) return null;
        const syst = roundAvg(all.map((p) => p!.systolic!));
        const dias = roundAvg(all.map((p) => p!.diastolic!));
        const pulses = all.map((p) => p?.pulse).filter((v): v is number => !!v);
        const pulse = roundAvg(pulses);
        return { label: fmtIsoShort(r.date), full: fmtIsoShort(r.date), syst, dias, pulse };
      })
      .filter((d): d is NonNullable<typeof d> => !!d);

  readonly chartOptions = (): LineChartOptions => {
    const data = this.chartData();
    return {
      labels: data.map((d) => d.label),
      fullLabels: data.map((d) => d.full),
      height: 320,
      series: [
        { label: 'Sistólica', color: '#ef4444', data: data.map((d) => d.syst) },
        { label: 'Diastólica', color: '#22c55e', data: data.map((d) => d.dias) },
        { label: 'Pulso', color: '#3b82f6', data: data.map((d) => d.pulse) },
      ],
    };
  };

  onPickDate(range: DateRange | null): void {
    if (range?.from) {
      this.date.set(range.from);
      this.calOpen.set(false);
    }
  }

  onSystolic(v: string): void {
    this.systolic.set(v);
    if (v.length >= 3) this.diasEl()?.nativeElement.focus();
  }

  onDiastolic(v: string): void {
    this.diastolic.set(v);
    if (v.length >= 2) this.pulsoEl()?.nativeElement.focus();
  }

  close(): void {
    this.open.set(false);
  }

  async addReading(): Promise<void> {
    if (!this.systolic() || !this.diastolic() || !this.period()) {
      this.toast.error('Erro de Validação', 'Por favor, preencha todos os campos obrigatórios (Sistólica e Diastólica).');
      return;
    }
    try {
      const reading: { systolic: number; diastolic: number; pulse?: number } = {
        systolic: Number(this.systolic()),
        diastolic: Number(this.diastolic()),
      };
      if (this.pulse()) reading.pulse = Number(this.pulse());
      await this.vitals.bloodPressure(toYMD(this.date()), { [this.period()!]: reading });
      this.toast.success('Sucesso!', 'Sua medição de pressão foi salva.');
      this.systolic.set('');
      this.diastolic.set('');
      this.pulse.set('');
      this.period.set('');
      this.date.set(new Date());
      this.close();
      await this.load();
    } catch {
      this.toast.error('Erro ao Salvar', 'Não foi possível salvar a medição. Tente novamente.');
    }
  }
}