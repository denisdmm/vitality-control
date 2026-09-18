import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { VaccinesService } from '../../core/medications.service';
import { fmtDate, parseIsoDate, toYMD } from '../../core/dates';
import type { DateRange } from '../../core/dates';
import type { Vaccine } from '../../models/medication-vaccine';
import { ButtonComponent } from '../ui/button';
import { DialogComponent } from '../ui/dialog';
import { InputComponent } from '../ui/input';
import { SelectComponent, SelectOption } from '../ui/select';
import { PopoverComponent } from '../ui/popover';
import { CalendarComponent } from '../ui/calendar';
import { IconComponent } from '../icon.component';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../ui/card';
import { TABLE_IMPORTS } from '../ui/table';

const SCHEDULE_OPTIONS: SelectOption[] = [
  { value: 'single-dose', label: 'Dose única' },
  { value: 'two-dose', label: 'Duas doses' },
  { value: 'three-dose', label: 'Três doses' },
];

export interface BoosterRecommendation {
  isBoosterNeeded: boolean;
  recommendedBoosterDate?: string | null;
  reason?: string;
}

/** Heurística determinística (substitui o agente de IA do legado). */
export function checkBooster(vaccines: Vaccine[]): BoosterRecommendation {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const vac of vaccines) {
    const interval = vac.intervalBetweenBoosterDoses ?? vac.intervalBetweenDoses;
    if (vac.vaccinationDate && interval) {
      const base = parseIsoDate(vac.vaccinationDate);
      const next = new Date(base.getFullYear(), base.getMonth() + interval, base.getDate());
      const needed = next <= today;
      return {
        isBoosterNeeded: needed,
        recommendedBoosterDate: needed ? toYMD(next) : null,
        reason: needed
          ? `${vac.vaccineName}: o próximo reforço (${
              vac.intervalBetweenBoosterDoses ? 'intervalo de reforços' : 'intervalo entre doses'
            } de ${interval} mes${interval > 1 ? 'es' : ''}) já venceu em ${fmtDate(next)}.`
          : `${vac.vaccineName}: próximo reforço previsto para ${fmtDate(next)}. Vacinação em dia.`,
      };
    }
  }
  return {
    isBoosterNeeded: false,
    recommendedBoosterDate: null,
    reason: 'Nenhuma vacina registrada requer reforço no momento (sem intervalo definido).',
  };
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

@Component({
  selector: 'app-vaccination-wallet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent, ButtonComponent, DialogComponent, InputComponent, SelectComponent, PopoverComponent, CalendarComponent, IconComponent, TABLE_IMPORTS],
  template: `
    <app-card>
      <app-card-header class="flex flex-col items-start gap-4">
        <div class="flex w-full flex-row items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <app-icon name="syringe" class="h-6 w-6 text-primary" />
            <div>
              <app-card-title>Carteira de Vacinação</app-card-title>
              <app-card-description class="hidden sm:block">Gerencie suas vacinas e verifique reforços</app-card-description>
            </div>
          </div>
          <button app-button size="sm" class="w-full md:w-auto" (click)="open.set(true)">
            <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
            Adicionar
          </button>
        </div>
      </app-card-header>
      <app-card-content>
        <div class="overflow-x-auto">
          <table app-table>
            <thead app-table-header>
              <tr app-table-row>
                <th app-table-head>Vacina</th>
                <th app-table-head>Data</th>
                <th app-table-head class="text-right"></th>
              </tr>
            </thead>
            <tbody app-table-body>
              @for (vac of vaccines(); track vac.id) {
                <tr app-table-row>
                  <td app-table-cell class="font-medium">{{ vac.vaccineName }}</td>
                  <td app-table-cell>{{ fmtDate(parseIsoDate(vac.vaccinationDate)) }}</td>
                  <td app-table-cell class="text-right">
                    <button app-button variant="ghost" size="icon" (click)="remove(vac)">
                      <app-icon name="trash2" class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex flex-col items-center gap-4">
          <button app-button (click)="handleCheckBooster()" [disabled]="isChecking() || vaccines().length === 0">
            @if (isChecking()) {
              <app-icon name="loader2" class="mr-2 h-4 w-4 animate-spin" />
            } @else {
              <app-icon name="shieldCheck" class="mr-2 h-4 w-4" />
            }
            Verificar Reforços com IA
          </button>
          @if (recommendation()) {
            <div
              class="relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7"
              [class]="recommendation()!.isBoosterNeeded ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'"
            >
              @if (recommendation()!.isBoosterNeeded) {
                <app-icon name="shieldAlert" class="h-4 w-4 text-amber-600" />
                <h5 class="mb-1 font-medium leading-none tracking-tight text-amber-800">Reforço Recomendado</h5>
                <div class="text-sm text-amber-700 [&_p]:leading-relaxed">
                  <p>
                    @if (recommendation()!.recommendedBoosterDate) {
                      Data recomendada: {{ fmtDate(parseIsoDate(recommendation()!.recommendedBoosterDate!)) }}.
                    }
                    {{ recommendation()!.reason }}
                  </p>
                </div>
              } @else {
                <app-icon name="shieldCheck" class="h-4 w-4 text-emerald-600" />
                <h5 class="mb-1 font-medium leading-none tracking-tight text-emerald-800">Vacinação em Dia</h5>
                <div class="text-sm text-emerald-700 [&_p]:leading-relaxed">
                  <p>{{ recommendation()!.reason }}</p>
                </div>
              }
            </div>
          }
          <div class="flex max-w-md items-center text-center text-xs text-muted-foreground">
            <app-icon name="info" class="mr-2 h-3 w-3 shrink-0" />
            Esta é uma verificação baseada em diretrizes gerais e não substitui uma consulta médica.
          </div>
        </div>
      </app-card-content>
    </app-card>

    <app-dialog [open]="open()" (close)="close()" panelClass="sm:max-w-[425px]">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Adicionar Vacina</h2>
        <p class="mt-2 text-sm text-muted-foreground">Insira os detalhes da vacina recebida.</p>
      </div>
      <div class="grid gap-4 px-6">
        <input app-input placeholder="Nome da Vacina" [value]="vaccineName()" (input)="vaccineName.set(inputValue($event))" />
        <app-popover [open]="calOpen()" (openChange)="calOpen.set($event)">
          <button app-button variant="outline" slot="trigger" class="w-full justify-start text-left font-normal">
            <app-icon name="calendar" class="mr-2 h-4 w-4" />
            {{ vaccinationDate() ? fmtDate(vaccinationDate()!) : 'Data da vacinação' }}
          </button>
          <div slot="panel" class="p-0">
            <app-calendar mode="single" [value]="dateRange()" (valueChange)="onPickDate($event)" />
          </div>
        </app-popover>
        <app-select [options]="scheduleOptions" [placeholder]="'Esquema da série (opcional)'" [(value)]="seriesSchedule" />
        <input app-input type="number" placeholder="Intervalo entre doses (meses)" [value]="intervalBetweenDoses()" (input)="intervalBetweenDoses.set(inputValue($event))" />
        <input app-input type="number" placeholder="Intervalo entre reforços (meses)" [value]="intervalBetweenBoosterDoses()" (input)="intervalBetweenBoosterDoses.set(inputValue($event))" />
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="close()">Cancelar</button>
        <button app-button (click)="add()">Salvar</button>
      </div>
    </app-dialog>
  `,
})
export class VaccinationWalletComponent {
  private readonly vaccinesSvc = inject(VaccinesService);
  private readonly toast = inject(ToastService);

  readonly vaccines = signal<Vaccine[]>([]);
  readonly recommendation = signal<BoosterRecommendation | null>(null);
  readonly isChecking = signal(false);
  readonly open = signal(false);
  readonly calOpen = signal(false);

  readonly vaccineName = signal('');
  readonly vaccinationDate = signal<Date | null>(null);
  readonly seriesSchedule = signal('');
  readonly intervalBetweenDoses = signal('');
  readonly intervalBetweenBoosterDoses = signal('');

  readonly scheduleOptions = SCHEDULE_OPTIONS;
  readonly inputValue = inputValue;
  readonly dateRange = () =>
    (this.vaccinationDate() ? { from: this.vaccinationDate()!, to: undefined } : null) as DateRange | null;
  readonly fmtDate = fmtDate;
  readonly parseIsoDate = parseIsoDate;

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    try {
      this.vaccines.set(await this.vaccinesSvc.list());
    } catch {
      this.vaccines.set([]);
    }
  }

  onPickDate(range: DateRange | null): void {
    if (range?.from) {
      this.vaccinationDate.set(range.from);
      this.calOpen.set(false);
    }
  }

  close(): void {
    this.open.set(false);
  }

  async add(): Promise<void> {
    const name = this.vaccineName().trim();
    const date = this.vaccinationDate();
    if (!name || !date) return;
    try {
      await this.vaccinesSvc.create({
        vaccineName: name,
        vaccinationDate: toYMD(date),
        seriesSchedule: this.seriesSchedule() || undefined,
        intervalBetweenDoses: this.intervalBetweenDoses() ? Number(this.intervalBetweenDoses()) : undefined,
        intervalBetweenBoosterDoses: this.intervalBetweenBoosterDoses() ? Number(this.intervalBetweenBoosterDoses()) : undefined,
      });
      this.vaccineName.set('');
      this.vaccinationDate.set(null);
      this.seriesSchedule.set('');
      this.intervalBetweenDoses.set('');
      this.intervalBetweenBoosterDoses.set('');
      this.close();
      await this.load();
    } catch {
      this.toast.error('Erro', 'Não foi possível registrar a vacina.');
    }
  }

  async remove(vac: Vaccine): Promise<void> {
    try {
      await this.vaccinesSvc.remove(vac.id);
      await this.load();
    } catch {
      this.toast.error('Erro', 'Não foi possível remover a vacina.');
    }
  }

  handleCheckBooster(): void {
    this.isChecking.set(true);
    this.recommendation.set(null);
    window.setTimeout(() => {
      this.recommendation.set(checkBooster(this.vaccines()));
      this.isChecking.set(false);
    }, 250);
  }
}