import { Component, ChangeDetectionStrategy, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { SharedDataService } from '../../core/shared-data.service';
import { VitalsService } from '../../core/vitals.service';
import { daysAgo, fmtIso, fmtIsoShort, toYMD } from '../../core/dates';
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
import { IconComponent } from '../../shared/icon.component';
import { BloodPressureReportComponent } from '../../shared/reports/blood-pressure-report';
import { TABLE_IMPORTS } from '../../shared/ui/table';

export const PERIOD_LABEL: Record<PeriodName, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
const PERIOD_OPTIONS: SelectOption[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
];

function fmtIsoNo(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function isHigh(reading: { systolic?: number; diastolic?: number } | null | undefined, limits: { systolicLimit: number | null; diastolicLimit: number | null }): boolean {
  if (!reading?.systolic || !reading?.diastolic) return false;
  return (
    (limits.systolicLimit ? reading.systolic >= limits.systolicLimit : false) ||
    (limits.diastolicLimit ? reading.diastolic >= limits.diastolicLimit : false)
  );
}

function readingText(reading: { systolic?: number; diastolic?: number; pulse?: number } | null | undefined): string {
  if (!reading?.systolic || !reading?.diastolic) return '-';
  let text = `${reading.systolic}/${reading.diastolic}`;
  if (reading.pulse) text += ` (${reading.pulse})`;
  return text;
}

type BPValue = { systolic?: number; diastolic?: number; pulse?: number } | null | undefined;

@Component({
  selector: 'app-bp-reading-cell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (value()) {
      <span class="inline-flex items-center justify-center gap-1"
        [class.font-bold.text-destructive]="high()">
        @if (high()) {
          <app-icon name="shieldAlert" class="h-4 w-4" fill="true" />
        }
        {{ readingText(value()) }}
      </span>
    } @else {
      <span class="text-muted-foreground">-</span>
    }
  `,
})
export class BpReadingCellComponent {
  readonly value = input<BPValue>(null);
  readonly systolicLimit = input<number | null>(null);
  readonly diastolicLimit = input<number | null>(null);

  readonly high = () =>
    isHigh(this.value(), { systolicLimit: this.systolicLimit(), diastolicLimit: this.diastolicLimit() });
  readonly readingText = readingText;
}

@Component({
  selector: 'app-pressao-arterial',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent,
    ButtonComponent, DialogComponent, SelectComponent, PopoverComponent, CalendarComponent,
    InputComponent, LabelComponent, IconComponent, BloodPressureReportComponent, BpReadingCellComponent, TABLE_IMPORTS,
  ],
  template: `
    <app-card class="mx-auto w-full max-w-5xl">
      <app-card-header class="flex flex-col items-start gap-4">
        <div class="flex w-full flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <app-card-title>Histórico de Medições</app-card-title>
            <app-card-description>Gerencie seus registros diários de pressão arterial.</app-card-description>
          </div>
          <div class="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <button app-button size="sm" class="w-full md:w-auto" (click)="openPrint.set(true)" [disabled]="readings().length === 0">
              <app-icon name="printer" class="mr-2 h-4 w-4" />
              Relatório
            </button>
            <button app-button size="sm" class="w-full md:w-auto" (click)="openAdd()">
              <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
              Novo Registro
            </button>
          </div>
        </div>
        <div>
          <label app-label class="text-sm font-medium">Período de Visualização</label>
          <app-popover [open]="rangeOpen()" (openChange)="rangeOpen.set($event)">
            <button app-button variant="outline" slot="trigger"
              class="mt-2 w-full justify-start text-left font-normal md:w-[280px]"
              [class.text-muted-foreground]="!range().from">
              <app-icon name="calendar" class="mr-2 h-4 w-4" />
              {{ fmtIsoRange() }}
            </button>
            <div slot="panel" class="p-0">
              <app-calendar mode="range" [value]="range()" (valueChange)="onRangeChange($event)" />
            </div>
          </app-popover>
        </div>
      </app-card-header>

      <app-card-content>
        @if (loading()) {
          <div class="flex h-64 items-center justify-center">
            <p class="text-center text-muted-foreground">Carregando registros...</p>
          </div>
        } @else if (readings().length > 0) {
          <div class="hidden overflow-x-auto md:block">
            <table app-table>
              <thead app-table-header>
                <tr app-table-row>
                  <th app-table-head>Data</th>
                  @for (p of periods; track p) {
                    <ng-container>
                      <th app-table-head class="border-l text-center">{{ PERIOD_LABEL[p] }}</th>
                      <th app-table-head class="w-[100px] text-center">Ações</th>
                    </ng-container>
                  }
                </tr>
              </thead>
              <tbody app-table-body>
                @for (day of readings(); track day.id) {
                  <tr app-table-row>
                    <td app-table-cell class="font-medium">{{ fmtIso(day.date) }}</td>
                    @for (p of periods; track p) {
                      <ng-container>
                        <td app-table-cell class="text-center">
                          <app-bp-reading-cell [value]="day.bloodPressurePeriods?.[p]"
                            [systolicLimit]="sysLimit()" [diastolicLimit]="diasLimit()" />
                        </td>
                        <td app-table-cell class="text-center">
                          <div class="flex items-center justify-center gap-1">
                            @if (day.bloodPressurePeriods?.[p]) {
                              <button app-button variant="ghost" size="icon" class="h-6 w-6" (click)="openEdit(day, p)">
                                <app-icon name="pencil" class="h-3 w-3" />
                              </button>
                              <button app-button variant="ghost" size="icon" class="h-6 w-6" (click)="onDelete(day, p)">
                                <app-icon name="trash2" class="h-3 w-3" />
                              </button>
                            } @else {
                              <button app-button variant="ghost" size="icon" class="h-6 w-6" (click)="openEdit(day, p)">
                                <app-icon name="plusCircle" class="h-4 w-4 text-muted-foreground" />
                              </button>
                            }
                          </div>
                        </td>
                      </ng-container>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="block space-y-4 md:hidden">
            @for (day of readings(); track day.id) {
              <div class="rounded-lg border">
                <div class="bg-muted p-3">
                  <h3 class="font-semibold">{{ fmtIso(day.date) }}</h3>
                </div>
                <div class="divide-y">
                  @for (p of periods; track p) {
                    <div class="flex items-center justify-between p-3">
                      <span class="w-16 font-medium text-muted-foreground">{{ PERIOD_LABEL[p] }}</span>
                      <div class="flex-1 text-center">
                        <app-bp-reading-cell [value]="day.bloodPressurePeriods?.[p]"
                          [systolicLimit]="sysLimit()" [diastolicLimit]="diasLimit()" />
                      </div>
                      <div class="flex w-32 items-center justify-end gap-1">
                        @if (day.bloodPressurePeriods?.[p]) {
                          <button app-button variant="ghost" size="icon" class="h-7 w-7" (click)="openEdit(day, p)">
                            <app-icon name="pencil" class="h-4 w-4" />
                          </button>
                          <button app-button variant="ghost" size="icon" class="h-7 w-7" (click)="onDelete(day, p)">
                            <app-icon name="trash2" class="h-4 w-4" />
                          </button>
                        } @else {
                          <button app-button variant="ghost" size="sm" class="text-muted-foreground" (click)="openEdit(day, p)">
                            <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
                            Adicionar
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
            <p>Nenhum registro encontrado para o período selecionado.</p>
          </div>
        }
      </app-card-content>
    </app-card>

    <app-dialog [open]="dialogOpen()" (close)="dialogOpen.set(false)">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">{{ editingDate() ? 'Editar Medição' : 'Nova Medição' }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">Insira os valores de pressão para o período selecionado.</p>
      </div>
      <div class="grid gap-4 px-6">
        <div>
          <label app-label class="mb-2 block">Data</label>
          <app-popover [open]="calOpen()" (openChange)="calOpen.set($event)">
            <button app-button variant="outline" slot="trigger" class="w-full justify-start text-left font-normal" [disabled]="!!editingDate()">
              <app-icon name="calendar" class="mr-2 h-4 w-4" />
              {{ fmtIso(formDateIso()) }}
            </button>
            <div slot="panel" class="p-0">
              <app-calendar mode="single" [value]="singleRange()" (valueChange)="onPickFormDate($event)" />
            </div>
          </app-popover>
        </div>
        <div>
          <label app-label class="mb-2 block">Período</label>
          @if (editingDate()) {
            <button app-button variant="outline" class="w-full justify-between" disabled>
              {{ periodLabel() }}
            </button>
          } @else {
            <app-select [options]="periodOptions" [placeholder]="'Selecione o período do dia'" [(value)]="period" />
          }
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label app-label class="mb-2 block">Sistólica (mmHg)</label>
            <input app-input placeholder="ex: 120" type="number" [value]="systolic()" (input)="onSystolic(inputValue($event))" />
          </div>
          <div>
            <label app-label class="mb-2 block">Diastólica (mmHg)</label>
            <input app-input #diasRef placeholder="ex: 80" type="number" [value]="diastolic()" (input)="onDiastolic(inputValue($event))" />
          </div>
        </div>
        <div>
          <label app-label class="mb-2 block">Pulso (bpm)</label>
          <input app-input #pulsoRef placeholder="ex: 70" type="number" [value]="pulse()" (input)="onPulse(inputValue($event))" />
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="dialogOpen.set(false)">Cancelar</button>
        <button app-button (click)="handleSave()">Salvar</button>
      </div>
    </app-dialog>

    <app-dialog [open]="openPrint()" (close)="openPrint.set(false)" panelClass="sm:max-w-4xl">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Protótipo de Impressão</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Este é um protótipo de como o seu relatório será impresso. Use o botão abaixo para baixar o PDF.
        </p>
      </div>
      <div class="max-h-[70vh] overflow-y-auto p-2" #reportArea>
        <app-blood-pressure-report
          [patientName]="patientName()"
          [readings]="readings()"
          [healthIndices]="healthIndices()" />
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="openPrint.set(false)">Cancelar</button>
        <button app-button (click)="generatePdf()" [disabled]="generatingPdf()">
          @if (generatingPdf()) {
            <app-icon name="loader2" class="mr-2 h-4 w-4 animate-spin" />
            Gerando...
          } @else {
            <app-icon name="download" class="mr-2 h-4 w-4" />
            Baixar PDF
          }
        </button>
      </div>
    </app-dialog>
  `,
})
export class PressaoArterialComponent {
  private readonly vitals = inject(VitalsService);
  private readonly sharedData = inject(SharedDataService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly periods: PeriodName[] = ['manha', 'tarde', 'noite'];
  readonly periodOptions = PERIOD_OPTIONS;
  readonly PERIOD_LABEL = PERIOD_LABEL;
  readonly fmtIso = fmtIso;
  readonly inputValue = (e: Event) => (e.target as HTMLInputElement).value;

  readonly readings = signal<VitalScore[]>([]);
  readonly loading = signal(true);
  readonly range = signal<DateRange>({ from: daysAgo(29), to: new Date() });
  readonly rangeOpen = signal(false);
  readonly dialogOpen = signal(false);
  readonly openPrint = signal(false);
  readonly generatingPdf = signal(false);
  readonly calOpen = signal(false);

  readonly editingDate = signal('');
  readonly editingPeriod = signal<PeriodName | ''>('');
  readonly formDate = signal<Date>(new Date());
  readonly period = signal<PeriodName | ''>('');
  readonly systolic = signal('');
  readonly diastolic = signal('');
  readonly pulse = signal('');

  readonly sysLimit = signal<number | null>(null);
  readonly diasLimit = signal<number | null>(null);

  private readonly healthIndicesSig = signal<{ systolicIdeal: number | null; diastolicIdeal: number | null; systolicLimit: number | null; diastolicLimit: number | null } | null>(null);
  readonly healthIndices = () => this.healthIndicesSig();

  readonly diasEl = viewChild<ElementRef<HTMLInputElement>>('diasRef');
  readonly pulsoEl = viewChild<ElementRef<HTMLInputElement>>('pulsoRef');
  readonly reportEl = viewChild<ElementRef<HTMLDivElement>>('reportArea');

  readonly singleRange = () => ({ from: this.formDate(), to: undefined }) as DateRange | null;
  readonly formDateIso = () => toYMD(this.formDate());
  readonly fmtIsoRange = () => {
    const r = this.range();
    if (!r.from) return 'Selecione um período';
    return r.to ? `${fmtIsoNo(r.from)} - ${fmtIsoNo(r.to)}` : fmtIsoNo(r.from);
  };
  readonly patientName = () => this.auth.user()?.fullName || 'Paciente';
  readonly periodLabel = () => PERIOD_LABEL[(this.editingPeriod() || 'manha') as PeriodName];

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

  private async loadIndices(): Promise<void> {
    try {
      const sd: SharedData = await this.sharedData.get();
      this.sysLimit.set(sd.bpSystolicLimit);
      this.diasLimit.set(sd.bpDiastolicLimit);
      this.healthIndicesSig.set({
        systolicIdeal: sd.bpSystolicIdeal,
        diastolicIdeal: sd.bpDiastolicIdeal,
        systolicLimit: sd.bpSystolicLimit,
        diastolicLimit: sd.bpDiastolicLimit,
      });
    } catch {
      /* silencioso */
    }
  }

  constructor() {
    void this.load();
    void this.loadIndices();
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
    this.editingPeriod.set('');
    this.formDate.set(new Date());
    this.period.set('');
    this.systolic.set('');
    this.diastolic.set('');
    this.pulse.set('');
    this.dialogOpen.set(true);
  }

  openEdit(day: VitalScore, p: PeriodName): void {
    this.editingDate.set(day.date);
    this.editingPeriod.set(p);
    this.formDate.set(new Date(toYMD(day.date) + 'T00:00:00'));
    this.period.set(p);
    const reading = day.bloodPressurePeriods?.[p];
    this.systolic.set(reading?.systolic ? String(reading.systolic) : '');
    this.diastolic.set(reading?.diastolic ? String(reading.diastolic) : '');
    this.pulse.set(reading?.pulse ? String(reading.pulse) : '');
    this.dialogOpen.set(true);
  }

  onPickFormDate(r: DateRange | null): void {
    if (r?.from) {
      this.formDate.set(r.from);
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

  onPulse(v: string): void {
    this.pulse.set(v);
  }

  async handleSave(): Promise<void> {
    if (!this.systolic() || !this.diastolic() || !this.period()) {
      this.toast.error('Erro de Validação', 'Por favor, preencha todos os campos obrigatórios (Sistólica e Diastólica).');
      return;
    }
    try {
      const dateStr = toYMD(this.formDate());
      const reading: { systolic: number; diastolic: number; pulse?: number } = {
        systolic: Number(this.systolic()),
        diastolic: Number(this.diastolic()),
      };
      if (this.pulse()) reading.pulse = Number(this.pulse());
      await this.vitals.bloodPressure(dateStr, { [this.period()!]: reading });
      this.toast.success('Sucesso!', 'Medição salva.');
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      this.toast.error('Erro ao Salvar', 'Não foi possível salvar a medição.');
    }
  }

  async onDelete(day: VitalScore, p: PeriodName): Promise<void> {
    if (!confirm(`Tem certeza que deseja excluir a medição da ${PERIOD_LABEL[p]}?`)) return;
    try {
      await this.vitals.bloodPressure(toYMD(day.date), { [p]: null });
      this.toast.success('Excluído', 'O registro de medição foi removido.');
      await this.load();
    } catch {
      this.toast.error('Erro ao Excluir', 'Não foi possível remover o registro.');
    }
  }

  async generatePdf(): Promise<void> {
    const report = this.reportEl()?.nativeElement as HTMLElement | undefined;
    const user = this.auth.user();
    if (!report) return;
    this.generatingPdf.set(true);
    try {
      const canvas = await html2canvas(report, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 42.5;
      const contentWidth = pageWidth - margin * 2;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      let finalImgWidth = contentWidth;
      let finalImgHeight = finalImgWidth / ratio;
      if (finalImgHeight > pageHeight - margin * 2) {
        finalImgHeight = pageHeight - margin * 2;
        finalImgWidth = finalImgHeight * ratio;
      }
      const x = (pageWidth - finalImgWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, margin, finalImgWidth, finalImgHeight);
      pdf.save(`relatorio-pressao-${user?.name || 'paciente'}.pdf`);
    } catch {
      this.toast.error('Erro ao gerar PDF', 'Não foi possível criar o arquivo.');
    } finally {
      this.generatingPdf.set(false);
      this.openPrint.set(false);
    }
  }
}