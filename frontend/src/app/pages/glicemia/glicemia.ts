import { Component, ChangeDetectionStrategy, inject, input, signal } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { SharedDataService } from '../../core/shared-data.service';
import { VitalsService } from '../../core/vitals.service';
import { daysAgo, fmtIsoShort, toYMD } from '../../core/dates';
import type { DateRange } from '../../core/dates';
import type { PeriodName, VitalScore } from '../../models/vital';
import type { SharedData } from '../../models/medication-vaccine';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { DialogComponent } from '../../shared/ui/dialog';
import { SelectComponent, SelectOption } from '../../shared/ui/select';
import { PopoverComponent } from '../../shared/ui/popover';
import { CalendarComponent } from '../../shared/ui/calendar';
import { InputComponent, LabelComponent } from '../../shared/ui/input';
import { CheckboxComponent } from '../../shared/ui/checkbox';
import { TABLE_IMPORTS } from '../../shared/ui/table';
import { IconComponent } from '../../shared/icon.component';

const PERIOD_LABEL: Record<PeriodName, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
const PERIOD_OPTIONS: SelectOption[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
];

type GlucoseValue = { value?: number; fasting?: boolean } | null | undefined;

@Component({
  selector: 'app-glucose-reading-cell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (value()) {
      <span class="inline-flex items-center justify-center gap-1"
        [class]="cellClass()">
        @if (highAlert()) {
          <app-icon name="skull" class="h-4 w-4" fill="true" />
        } @else if (warning()) {
          <app-icon name="triangleAlert" class="h-4 w-4" fill="true" />
        }
        {{ value()!.value }}
      </span>
    } @else {
      <span class="text-muted-foreground">-</span>
    }
  `,
})
export class GlucoseReadingCellComponent {
  readonly value = input<GlucoseValue>(null);
  readonly preLimit = input<number | null>(null);
  readonly diabetesLimit = input<number | null>(null);

  readonly highAlert = () =>
    this.diabetesLimit() != null && Boolean(this.value()?.value && this.value()!.value! >= this.diabetesLimit()!);
  readonly warning = () =>
    this.preLimit() != null && Boolean(this.value()?.value && this.value()!.value! >= this.preLimit()!);
  readonly cellClass = () => {
    if (this.diabetesLimit() != null && Boolean(this.value()?.value && this.value()!.value! >= this.diabetesLimit()!)) {
      return 'font-bold text-destructive';
    }
    if (this.preLimit() != null && Boolean(this.value()?.value && this.value()!.value! >= this.preLimit()!)) {
      return 'font-bold text-amber-600';
    }
    return '';
  };
}

@Component({
  selector: 'app-glicemia',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent,
    ButtonComponent, DialogComponent, SelectComponent, PopoverComponent, CalendarComponent,
    InputComponent, LabelComponent, IconComponent, GlucoseReadingCellComponent, CheckboxComponent, TABLE_IMPORTS,
  ],
  template: `
    <app-card class="mx-auto w-full max-w-5xl">
      <app-card-header class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <app-card-title>Histórico de Glicemia</app-card-title>
          <app-card-description>Acompanhe seus níveis de glicose no sangue.</app-card-description>
        </div>
        <button app-button (click)="openAdd()">
          <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
          Novo Registro
        </button>
      </app-card-header>
      <app-card-content>
        <div class="mb-6">
          <label app-label>Período</label>
          <app-popover [open]="rangeOpen()" (openChange)="rangeOpen.set($event)">
            <button app-button variant="outline" slot="trigger"
              class="mt-2 w-full justify-start text-left md:w-[280px]"
              [class.text-muted-foreground]="!range().from">
              <app-icon name="calendar" class="mr-2 h-4 w-4" />
              {{ fmtIsoRange() }}
            </button>
            <div slot="panel" class="p-0">
              <app-calendar mode="range" [value]="range()" (valueChange)="onRangeChange($event)" />
            </div>
          </app-popover>
        </div>

        @if (loading()) {
          <div class="flex h-40 items-center justify-center text-muted-foreground">Carregando...</div>
        } @else {
          <div class="overflow-hidden rounded-md border">
            <table app-table>
              <thead app-table-header>
                <tr app-table-row class="bg-muted">
                  <th app-table-head>Data</th>
                  <th app-table-head class="text-center">Manhã</th>
                  <th app-table-head class="text-center">Tarde</th>
                  <th app-table-head class="text-center">Noite</th>
                  <th app-table-head class="text-right">Ações</th>
                </tr>
              </thead>
              <tbody app-table-body>
                @for (r of readings(); track r.id) {
                  <tr app-table-row>
                    <td app-table-cell class="font-medium">{{ fmtIsoShort(r.date) }}</td>
                    <td app-table-cell class="text-center">
                      <app-glucose-reading-cell [value]="r.glucosePeriods?.manha" [preLimit]="preLimit()" [diabetesLimit]="diabetesLimit()" />
                    </td>
                    <td app-table-cell class="text-center">
                      <app-glucose-reading-cell [value]="r.glucosePeriods?.tarde" [preLimit]="preLimit()" [diabetesLimit]="diabetesLimit()" />
                    </td>
                    <td app-table-cell class="text-center">
                      <app-glucose-reading-cell [value]="r.glucosePeriods?.noite" [preLimit]="preLimit()" [diabetesLimit]="diabetesLimit()" />
                    </td>
                    <td app-table-cell class="space-x-1 text-right">
                      <button app-button variant="ghost" size="icon" (click)="openEdit(r)">
                        <app-icon name="pencil" class="h-4 w-4" />
                      </button>
                      <button app-button variant="ghost" size="icon" (click)="onDelete(r)">
                        <app-icon name="trash2" class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr app-table-row>
                    <td app-table-cell class="py-10 text-center text-muted-foreground" colspan="5">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </app-card-content>
    </app-card>

    <app-dialog [open]="dialogOpen()" (close)="dialogOpen.set(false)">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">{{ editingDate() ? 'Editar Glicemia' : 'Nova Glicemia' }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">Valores em mg/dL.</p>
      </div>
      <div class="grid gap-4 px-6">
        <div class="space-y-2">
          <label app-label>Data</label>
          <app-popover [open]="calOpen()" (openChange)="calOpen.set($event)">
            <button app-button variant="outline" slot="trigger" class="w-full justify-start" [disabled]="!!editingDate()">
              <app-icon name="calendar" class="mr-2 h-4 w-4" />
              {{ fmtIsoShort(toYMD(formDate())) }}
            </button>
            <div slot="panel" class="p-0">
              <app-calendar mode="single" [value]="singleRange()" (valueChange)="onPickFormDate($event)" />
            </div>
          </app-popover>
        </div>
        <div class="space-y-2">
          <label app-label>Período</label>
          @if (editingDate()) {
            <button app-button variant="outline" class="w-full justify-between" disabled>
              {{ periodLabel() }}
            </button>
          } @else {
            <app-select [options]="periodOptions" [placeholder]="'Selecione...'" [(value)]="selectedPeriod" />
          }
        </div>
        <div class="space-y-2">
          <label app-label>Valor (mg/dL)</label>
          <input app-input type="number" placeholder="ex: 95" [value]="value()" (input)="onValue(inputValue($event))" />
        </div>
        @if (!editingDate()) {
          <div class="flex items-center gap-2">
            <app-checkbox [(checked)]="fasting" />
          <label app-label class="text-sm">Em jejum</label>
          </div>
        }
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="dialogOpen.set(false)">Cancelar</button>
        <button app-button (click)="handleSave()">Salvar</button>
      </div>
    </app-dialog>
  `,
})
export class GlicemiaComponent {
  private readonly vitals = inject(VitalsService);
  private readonly sharedData = inject(SharedDataService);
  private readonly toast = inject(ToastService);

  readonly periodOptions = PERIOD_OPTIONS;
  readonly PERIOD_LABEL = PERIOD_LABEL;
  readonly fmtIsoShort = fmtIsoShort;
  readonly toYMD = toYMD;
  readonly inputValue = (e: Event) => (e.target as HTMLInputElement).value;

  readonly readings = signal<VitalScore[]>([]);
  readonly loading = signal(true);
  readonly range = signal<DateRange>({ from: daysAgo(29), to: new Date() });
  readonly rangeOpen = signal(false);
  readonly dialogOpen = signal(false);
  readonly calOpen = signal(false);

  readonly preLimit = signal<number | null>(null);
  readonly diabetesLimit = signal<number | null>(null);

  readonly editingDate = signal('');
  readonly formDate = signal<Date>(new Date());
  readonly selectedPeriod = signal<PeriodName | ''>('');
  readonly value = signal('');
  readonly fasting = signal(false);

  readonly singleRange = () => ({ from: this.formDate(), to: undefined }) as DateRange | null;
  readonly periodLabel = () => PERIOD_LABEL[(this.selectedPeriod() || 'manha') as PeriodName];
  readonly fmtIsoRange = () => {
    const r = this.range();
    if (!r.from) return 'Selecione';
    const fShort = `${r.from.getDate()}/${String(r.from.getMonth() + 1).padStart(2, '0')}/${String(r.from.getFullYear()).slice(2)}`;
    if (!r.to) return fShort;
    const tShort = `${r.to.getDate()}/${String(r.to.getMonth() + 1).padStart(2, '0')}/${String(r.to.getFullYear()).slice(2)}`;
    return `${fShort} - ${tShort}`;
  };

  constructor() {
    void this.load();
    void this.loadThresholds();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const r = this.range();
      const rows = await this.vitals.list(toYMD(r.from || daysAgo(29)), r.to ? toYMD(r.to) : undefined);
      rows.sort((a, b) => a.date.localeCompare(b.date));
      this.readings.set(rows);
    } catch {
      this.readings.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadThresholds(): Promise<void> {
    try {
      const sd: SharedData = await this.sharedData.get();
      this.preLimit.set(sd.glucosePreLimit ?? 100);
      this.diabetesLimit.set(sd.glucoseDiabetesLimit ?? 126);
    } catch {
      this.preLimit.set(100);
      this.diabetesLimit.set(126);
    }
  }

  onRangeChange(r: DateRange | null): void {
    if (r?.from) {
      this.range.set(r);
      this.rangeOpen.set(false);
      void this.load();
    }
  }

  openAdd(): void {
    this.editingDate.set('');
    this.formDate.set(new Date());
    this.selectedPeriod.set('');
    this.value.set('');
    this.fasting.set(false);
    this.dialogOpen.set(true);
  }

  openEdit(day: VitalScore): void {
    this.editingDate.set(day.date);
    this.formDate.set(new Date(toYMD(day.date) + 'T00:00:00'));
    this.selectedPeriod.set('');
    this.value.set('');
    this.fasting.set(false);
    this.dialogOpen.set(true);
  }

  onPickFormDate(r: DateRange | null): void {
    if (r?.from) {
      this.formDate.set(r.from);
      this.calOpen.set(false);
    }
  }

  onValue(v: string): void {
    this.value.set(v);
  }

  async handleSave(): Promise<void> {
    if (!this.value() || !this.selectedPeriod()) {
      this.toast.error('Erro', 'Preencha todos os campos.');
      return;
    }
    try {
      const dateStr = toYMD(this.formDate());
      const reading: { value: number; fasting?: boolean } = { value: Number(this.value()) };
      if (this.fasting()) reading.fasting = true;
      await this.vitals.glucose(dateStr, { [this.selectedPeriod()!]: reading });
      this.toast.success('Sucesso!', 'Glicemia registrada.');
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      this.toast.error('Erro', 'Falha ao salvar.');
    }
  }

  async onDelete(day: VitalScore): Promise<void> {
    if (!confirm('Excluir todas as medições de glicose deste dia?')) return;
    try {
      await this.vitals.glucose(toYMD(day.date), { manha: null, tarde: null, noite: null });
      this.toast.success('Excluído', 'Medições de glicose removidas.');
      await this.load();
    } catch {
      this.toast.error('Erro', 'Falha ao excluir.');
    }
  }
}