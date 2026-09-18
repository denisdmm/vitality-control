import { Component, ChangeDetectionStrategy, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ToastService } from '../../core/toast.service';
import { VitalsService } from '../../core/vitals.service';
import { SharedDataService } from '../../core/shared-data.service';
import { daysAgo, fmtIso, toYMD } from '../../core/dates';
import type { DateRange } from '../../core/dates';
import type { AdminPatient } from '../../models/user';
import type { PeriodName, VitalScore } from '../../models/vital';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { DialogComponent } from '../../shared/ui/dialog';
import { SelectComponent, SelectOption } from '../../shared/ui/select';
import { PopoverComponent } from '../../shared/ui/popover';
import { CalendarComponent } from '../../shared/ui/calendar';
import { LabelComponent } from '../../shared/ui/input';
import { TABLE_IMPORTS } from '../../shared/ui/table';
import { IconComponent } from '../../shared/icon.component';
import { BpReadingCellComponent } from '../pressao-arterial/pressao';
import { BloodPressureReportComponent } from '../../shared/reports/blood-pressure-report';

function fmtIsoNo(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

@Component({
  selector: 'app-medico-pressao-arterial',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent,
    ButtonComponent, DialogComponent, SelectComponent, PopoverComponent, CalendarComponent,
    LabelComponent, IconComponent, TABLE_IMPORTS, BpReadingCellComponent, BloodPressureReportComponent,
  ],
  template: `
    <div class="flex flex-1 flex-col gap-6">
      <app-card class="w-full max-w-md">
        <app-card-header>
          <app-card-title>Selecionar Paciente</app-card-title>
          <app-card-description>Escolha um paciente para ver seus registros.</app-card-description>
        </app-card-header>
        <app-card-content>
          <app-select [options]="patientOptions()" [placeholder]="'Selecione um paciente'" [value]="selectedId()"
            (valueChange)="onSelect($event)" />
        </app-card-content>
      </app-card>

      @if (selectedId()) {
        <app-card>
          <app-card-header class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <app-card-title>Registros de {{ selectedName() }}</app-card-title>
              <app-card-description>Tabela com as medições de pressão arterial do paciente.</app-card-description>
            </div>
            <button app-button size="sm" (click)="openPrint.set(true)" [disabled]="filtered().length === 0">
              <app-icon name="printer" class="mr-2 h-4 w-4" />
              Imprimir Relatório
            </button>
          </app-card-header>
          <div class="border-y px-6 pb-4 pt-2">
            <label app-label class="mb-2 block text-sm font-medium">Período de Visualização</label>
            <app-popover [open]="rangeOpen()" (openChange)="rangeOpen.set($event)">
              <button app-button variant="outline" slot="trigger" class="w-full justify-start text-left font-normal md:w-[280px]">
                <app-icon name="calendar" class="mr-2 h-4 w-4" />
                {{ rangeLabel() }}
              </button>
              <div slot="panel" class="p-0">
                <app-calendar mode="range" [value]="range()" (valueChange)="onRangeChange($event)" />
              </div>
            </app-popover>
          </div>
          <app-card-content class="pt-6">
            @if (loading()) {
              <div class="flex h-40 items-center justify-center text-muted-foreground">Carregando...</div>
            } @else if (filtered().length > 0) {
              <div class="overflow-x-auto">
                <table app-table>
                  <thead app-table-header>
                    <tr app-table-row>
                      <th app-table-head>Data</th>
                      <th app-table-head class="border-l text-center">Manhã (S/D)</th>
                      <th app-table-head class="border-l text-center">Tarde (S/D)</th>
                      <th app-table-head class="border-l text-center">Noite (S/D)</th>
                    </tr>
                  </thead>
                  <tbody app-table-body>
                    @for (r of filtered(); track r.id) {
                      <tr app-table-row>
                        <td app-table-cell>{{ fmtIso(r.date) }}</td>
                        @for (p of periods; track p) {
                          <td app-table-cell class="border-l text-center">
                            <app-bp-reading-cell [value]="r.bloodPressurePeriods?.[p]"
                              [systolicLimit]="sysLimit()" [diastolicLimit]="diasLimit()" />
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
                <app-icon name="user" class="mb-4 h-12 w-12" />
                <p class="font-medium">Nenhum registro de pressão encontrado para este paciente no período selecionado.</p>
              </div>
            }
          </app-card-content>
        </app-card>
      }
    </div>

    <app-dialog [open]="openPrint()" (close)="openPrint.set(false)" panelClass="sm:max-w-4xl">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Protótipo de Impressão</h2>
        <p class="mt-2 text-sm text-muted-foreground">Use o botão abaixo para baixar o PDF.</p>
      </div>
      <div class="max-h-[70vh] overflow-y-auto p-2" #reportArea>
        <app-blood-pressure-report
          [patientName]="selectedName()"
          [readings]="filtered()"
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
export class MedicoPressaoArterialComponent {
  private readonly vitals = inject(VitalsService);
  private readonly sharedData = inject(SharedDataService);
  private readonly toast = inject(ToastService);

  readonly periods: PeriodName[] = ['manha', 'tarde', 'noite'];
  readonly fmtIso = fmtIso;

  readonly patients = signal<AdminPatient[]>([]);
  readonly selectedId = signal<string>('');
  readonly vitalsOfPatient = signal<VitalScore[]>([]);
  readonly loading = signal(false);
  readonly range = signal<DateRange>({ from: daysAgo(29), to: new Date() });
  readonly rangeOpen = signal(false);
  readonly openPrint = signal(false);
  readonly generatingPdf = signal(false);
  readonly sysLimit = signal<number | null>(null);
  readonly diasLimit = signal<number | null>(null);

  private readonly healthIndicesSig = signal<{ systolicIdeal: number | null; diastolicIdeal: number | null; systolicLimit: number | null; diastolicLimit: number | null } | null>(null);
  readonly healthIndices = () => this.healthIndicesSig();

  readonly reportEl = viewChild<ElementRef<HTMLDivElement>>('reportArea');

  readonly patientOptions = computed<SelectOption[]>(() =>
    this.patients().map((p) => ({ value: p.id, label: p.fullName })),
  );
  readonly selectedName = () =>
    this.patients().find((p) => p.id === this.selectedId())?.fullName ?? 'Paciente';

  readonly rangeLabel = () => {
    const r = this.range();
    if (!r.from) return 'Selecione um período';
    return r.to ? `${fmtIsoNo(r.from)} - ${fmtIsoNo(r.to)}` : fmtIsoNo(r.from);
  };

  readonly filtered = computed(() => {
    const r = this.range();
    const all = this.vitalsOfPatient();
    if (!r.from) return all;
    const from = toYMD(r.from);
    const to = r.to ? toYMD(r.to) : toYMD(new Date());
    return all
      .filter((v) => v.date >= from && v.date <= to)
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  constructor() {
    void this.loadPatients();
    void this.loadIndices();
  }

  private async loadPatients(): Promise<void> {
    try {
      this.patients.set(await this.vitals.patients());
    } catch {
      this.toast.error('Erro', 'Não foi possível carregar os pacientes.');
    }
  }

  private async loadIndices(): Promise<void> {
    try {
      const sd = await this.sharedData.get();
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

  async onSelect(id: string | null): Promise<void> {
    this.selectedId.set(id ?? '');
    if (!id) {
      this.vitalsOfPatient.set([]);
      return;
    }
    this.loading.set(true);
    try {
      const res = await this.vitals.pressureOfPatient(id);
      this.vitalsOfPatient.set(res.vitals);
    } catch {
      this.toast.error('Erro', 'Não foi possível carregar os registros do paciente.');
      this.vitalsOfPatient.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  onRangeChange(r: DateRange | null): void {
    if (r?.from) {
      this.range.set(r);
      this.rangeOpen.set(false);
    }
  }

  async generatePdf(): Promise<void> {
    const report = this.reportEl()?.nativeElement as HTMLElement | undefined;
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
      const ratio = canvas.width / canvas.height;
      let finalImgWidth = contentWidth;
      let finalImgHeight = finalImgWidth / ratio;
      if (finalImgHeight > pageHeight - margin * 2) {
        finalImgHeight = pageHeight - margin * 2;
        finalImgWidth = finalImgHeight * ratio;
      }
      const x = (pageWidth - finalImgWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, margin, finalImgWidth, finalImgHeight);
      pdf.save(`relatorio-pressao-${this.selectedName().toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } catch {
      this.toast.error('Erro ao gerar PDF', 'Não foi possível criar o arquivo.');
    } finally {
      this.generatingPdf.set(false);
      this.openPrint.set(false);
    }
  }
}