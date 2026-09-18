import { Component, ChangeDetectionStrategy, ElementRef, inject, signal, viewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { ReportsService } from '../../core/reports.service';
import { daysAgo, toYMD } from '../../core/dates';
import type { DateRange } from '../../core/dates';
import type { ConsolidatedReportResponse } from '../../models/user';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { PopoverComponent } from '../../shared/ui/popover';
import { CalendarComponent } from '../../shared/ui/calendar';
import { LabelComponent } from '../../shared/ui/input';
import { IconComponent } from '../../shared/icon.component';
import { ConsolidatedDay, ConsolidatedIndices, HealthConsolidatedReportComponent } from '../../shared/reports/consolidated-report';
import type { SharedDataLike } from '../../models/user';

function fmtShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
}

function fmtFull(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function toConsolidatedDays(res: ConsolidatedReportResponse): ConsolidatedDay[] {
  return res.vitals.map((v) => ({
    date: v.date,
    bp: (v.bloodPressurePeriods as ConsolidatedDay['bp']) ?? null,
    glucose: (v.glucosePeriods as ConsolidatedDay['glucose']) ?? null,
    weight: v.weight,
  }));
}

function toIndices(sd: SharedDataLike | null): ConsolidatedIndices | null {
  if (!sd) return null;
  return {
    bloodPressure: {
      systolicLimit: sd.bpSystolicLimit,
      diastolicLimit: sd.bpDiastolicLimit,
    },
    glucose: {
      preLimit: sd.glucosePreLimit,
      diabetesLimit: sd.glucoseDiabetesLimit,
    },
  };
}

@Component({
  selector: 'app-relatorios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent,
    ButtonComponent, PopoverComponent, CalendarComponent, LabelComponent, IconComponent,
    HealthConsolidatedReportComponent,
  ],
  template: `
    <div class="mx-auto w-full max-w-5xl space-y-6">
      <app-card>
        <app-card-header>
          <app-card-title>Filtrar Período</app-card-title>
          <app-card-description>Selecione as datas para cruzar os dados de Pressão, Glicemia e Peso.</app-card-description>
        </app-card-header>
        <app-card-content class="space-y-4">
          <div class="flex flex-col items-end gap-4 md:flex-row">
            <div class="flex-1 space-y-2">
              <label app-label>Período das Medições</label>
              <app-popover [open]="rangeOpen()" (openChange)="rangeOpen.set($event)">
                <button app-button variant="outline" slot="trigger" class="w-full justify-start">
                  <app-icon name="calendar" class="mr-2 h-4 w-4" />
                  {{ rangeLabel() }}
                </button>
                <div slot="panel" class="p-0">
                  <app-calendar mode="range" [value]="range()" (valueChange)="onRangeChange($event)" />
                </div>
              </app-popover>
            </div>
            <button app-button class="w-full md:w-auto" (click)="generate()" [disabled]="isGenerating()">
              @if (isGenerating()) {
                <app-icon name="loader2" class="mr-2 h-4 w-4 animate-spin" />
              } @else {
                <app-icon name="fileText" class="mr-2 h-4 w-4" />
              }
              Gerar Relatório
            </button>
          </div>
        </app-card-content>
      </app-card>

      @if (days().length > 0) {
        <div class="space-y-4">
          <div class="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
            <span class="text-sm font-medium text-muted-foreground">{{ days().length }} dias com registros encontrados.</span>
            <button app-button (click)="downloadPdf()" [disabled]="isDownloading()">
              @if (isDownloading()) {
                <app-icon name="loader2" class="mr-2 h-4 w-4 animate-spin" />
                Baixando...
              } @else {
                <app-icon name="download" class="mr-2 h-4 w-4" />
                Baixar PDF do Relatório
              }
            </button>
          </div>

          <div class="flex justify-center overflow-x-auto rounded-xl border bg-gray-200 p-8 shadow-inner">
            <div class="origin-top scale-[0.6] bg-white shadow-2xl transition-transform duration-300 sm:scale-[0.8] md:scale-100">
              <app-health-consolidated-report
                [patientName]="patientName()"
                [data]="days()"
                [healthIndices]="indices()"
                [periodLabel]="periodLabel()" />
            </div>
          </div>

          <div style="position:absolute;left:-9999px;top:0;width:800px">
            <app-health-consolidated-report #capture
              [patientName]="patientName()"
              [data]="days()"
              [healthIndices]="indices()"
              [periodLabel]="periodLabel()" />
          </div>
        </div>
      }
    </div>
  `,
})
export class RelatoriosComponent {
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly captureEl = viewChild<ElementRef<HTMLDivElement>>('capture');

  readonly range = signal<DateRange>({ from: daysAgo(29), to: new Date() });
  readonly rangeOpen = signal(false);
  readonly isGenerating = signal(false);
  readonly isDownloading = signal(false);
  readonly days = signal<ConsolidatedDay[]>([]);
  readonly indices = signal<ConsolidatedIndices | null>(null);
  readonly periodFrom = signal<Date>(daysAgo(29));
  readonly periodTo = signal<Date>(new Date());

  readonly patientName = () => this.auth.user()?.fullName || 'Paciente';

  readonly rangeLabel = () => {
    const r = this.range();
    if (!r.from) return 'Selecione o período';
    return r.to ? `${fmtShort(r.from)} - ${fmtShort(r.to)}` : fmtShort(r.from);
  };

  readonly periodLabel = () => {
    const r = this.range();
    const from = r.from
      ? fmtFull(r.from)
      : fmtFull(this.periodFrom());
    const to = r.to ? fmtFull(r.to) : fmtFull(this.periodTo());
    return r.to ? `${from} a ${to}` : from;
  };

  onRangeChange(r: DateRange | null): void {
    if (r?.from) {
      this.range.set(r);
      this.rangeOpen.set(false);
    }
  }

  async generate(): Promise<void> {
    const r = this.range();
    if (!r.from) {
      this.toast.error('Erro', 'Selecione um período.');
      return;
    }
    this.isGenerating.set(true);
    try {
      const from = toYMD(r.from);
      const to = r.to ? toYMD(r.to) : toYMD(new Date());
      const res = await this.reports.consolidated(from, to);
      this.days.set(toConsolidatedDays(res));
      this.indices.set(toIndices(res.indices));
      this.periodFrom.set(r.from);
      this.periodTo.set(r.to ?? new Date());
      if (res.vitals.length === 0) {
        this.toast.toast({ title: 'Aviso', description: 'Nenhum dado encontrado para este período.' });
      }
    } catch {
      this.toast.error('Erro ao consolidar dados.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async downloadPdf(): Promise<void> {
    const container = this.captureEl()?.nativeElement as HTMLElement | undefined;
    if (!container) return;
    this.isDownloading.set(true);
    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      let currentY = margin;

      const capturePart = async (element: HTMLElement) => {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 800,
        });
        const imgData = canvas.toDataURL('image/png');
        const height = (canvas.height * contentWidth) / canvas.width;
        return { imgData, height };
      };

      const addPart = (data: { imgData: string; height: number }) => {
        if (currentY + data.height > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        pdf.addImage(data.imgData, 'PNG', margin, currentY, contentWidth, data.height);
        currentY += data.height;
      };

      const headerEl = container.querySelector<HTMLElement>('[data-report-part="header"]');
      if (headerEl) {
        const part = await capturePart(headerEl);
        pdf.addImage(part.imgData, 'PNG', margin, currentY, contentWidth, part.height);
        currentY += part.height;
      }

      const tableHeaderEl = container.querySelector<HTMLElement>('[data-report-part="table-header"]');
      let tableHeaderData: { imgData: string; height: number } | null = null;
      if (tableHeaderEl) {
        tableHeaderData = await capturePart(tableHeaderEl);
        pdf.addImage(tableHeaderData.imgData, 'PNG', margin, currentY, contentWidth, tableHeaderData.height);
        currentY += tableHeaderData.height;
      }

      const dayRows = Array.from(container.querySelectorAll<HTMLElement>('[data-report-part="day-row"]'));
      for (const row of dayRows) {
        const part = await capturePart(row);
        if (currentY + part.height > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
          if (tableHeaderData) {
            pdf.addImage(tableHeaderData.imgData, 'PNG', margin, currentY, contentWidth, tableHeaderData.height);
            currentY += tableHeaderData.height;
          }
        }
        pdf.addImage(part.imgData, 'PNG', margin, currentY, contentWidth, part.height);
        currentY += part.height;
      }

      const footerEl = container.querySelector<HTMLElement>('[data-report-part="footer"]');
      if (footerEl) {
        const part = await capturePart(footerEl);
        addPart(part);
      }

      const name = (this.auth.user()?.fullName || 'paciente').toLowerCase().replace(/\s+/g, '-');
      pdf.save(`relatorio-consolidado-${name}.pdf`);
      this.toast.success('Sucesso', 'Relatório baixado com sucesso.');
    } catch {
      this.toast.error('Erro ao gerar PDF');
    } finally {
      this.isDownloading.set(false);
    }
  }
}