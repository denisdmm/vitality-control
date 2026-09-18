import { Component, ChangeDetectionStrategy, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { VitalsService } from '../../core/vitals.service';
import { fmtShort, toYMD } from '../../core/dates';
import type { DateRange } from '../../core/dates';
import type { PeriodName } from '../../models/vital';
import { ButtonComponent } from '../ui/button';
import { DialogComponent } from '../ui/dialog';
import { InputComponent, LabelComponent } from '../ui/input';
import { SelectComponent, SelectOption } from '../ui/select';
import { PopoverComponent } from '../ui/popover';
import { CalendarComponent } from '../ui/calendar';
import { SeparatorComponent } from '../ui/alert';
import { IconComponent } from '../icon.component';

const PERIOD_OPTIONS: SelectOption[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
];

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

@Component({
  selector: 'app-health-entry-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, DialogComponent, InputComponent, LabelComponent, SelectComponent, PopoverComponent, CalendarComponent, SeparatorComponent, IconComponent],
  template: `
    <button app-button class="gap-2 shadow-md" (click)="open.set(true)">
      <app-icon name="plusCircle" class="h-4 w-4" />
      Registrar Sinais Vitais
    </button>

    <app-dialog [open]="open()" (close)="close()" panelClass="sm:max-w-[500px]">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Registro Único de Saúde</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Insira suas medições abaixo. Deixe em branco os campos que não deseja registrar hoje.
        </p>
      </div>

      <div class="grid gap-6 px-6 py-2">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label app-label>Data</label>
            <app-popover [open]="calOpen()" (openChange)="calOpen.set($event)">
              <button app-button variant="outline" slot="trigger" class="w-full justify-start text-left font-normal">
                <app-icon name="calendar" class="mr-2 h-4 w-4" />
                {{ date() ? fmtShort(date()!) : 'Selecionar' }}
              </button>
              <div slot="panel" class="p-0">
                <app-calendar mode="single" [value]="dateRange()" (valueChange)="onPickDate($event)" />
              </div>
            </app-popover>
          </div>
          <div class="space-y-2">
            <label app-label>Período</label>
            <app-select [options]="periodOptions" [(value)]="period" />
          </div>
        </div>

        <app-separator />

        <div class="space-y-3">
          <div class="flex items-center gap-2 text-primary">
            <app-icon name="heartPulse" class="h-5 w-5" />
            <h3 class="font-semibold">Pressão Arterial</h3>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="space-y-1">
              <label app-label class="text-xs">Sistólica</label>
              <input app-input id="systolic" placeholder="120" type="number" [value]="systolic()" (input)="onSystolic(inputValue($event))" />
            </div>
            <div class="space-y-1">
              <label app-label class="text-xs">Diastólica</label>
              <input app-input #dias id="diastolic" placeholder="80" type="number" [value]="diastolic()" (input)="onDiastolic(inputValue($event))" />
            </div>
            <div class="space-y-1">
              <label app-label class="text-xs">Pulso</label>
              <input app-input #pulso id="pulse" placeholder="70" type="number" [value]="pulse()" (input)="pulse.set(inputValue($event))" />
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-2 text-primary">
            <app-icon name="droplets" class="h-5 w-5" />
            <h3 class="font-semibold">Glicemia</h3>
          </div>
          <div class="space-y-1">
            <label app-label class="text-xs">Valor (mg/dL)</label>
            <input app-input id="glucose" placeholder="ex: 95" type="number" [value]="glucose()" (input)="glucose.set(inputValue($event))" />
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-2 text-primary">
            <app-icon name="scale" class="h-5 w-5" />
            <h3 class="font-semibold">Peso Corporal</h3>
          </div>
          <div class="space-y-1">
            <label app-label class="text-xs">Peso (kg)</label>
            <input app-input id="weight" placeholder="ex: 75.5" type="number" step="0.1" [value]="weight()" (input)="weight.set(inputValue($event))" />
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 p-6 pt-4">
        <button app-button variant="outline" (click)="close()">Cancelar</button>
        <button app-button (click)="save()" [disabled]="isSaving() || (!systolic() && !glucose() && !weight())">
          @if (isSaving()) {
            <app-icon name="loader2" class="h-4 w-4 animate-spin" />
          }
          Confirmar Registros
        </button>
      </div>
    </app-dialog>
  `,
})
export class HealthEntryModalComponent {
  private readonly vitals = inject(VitalsService);
  private readonly toast = inject(ToastService);

  readonly open = signal(false);
  readonly isSaving = signal(false);
  readonly calOpen = signal(false);

  readonly date = signal<Date>(new Date());
  readonly period = signal<PeriodName>('manha');
  readonly systolic = signal('');
  readonly diastolic = signal('');
  readonly pulse = signal('');
  readonly glucose = signal('');
  readonly weight = signal('');

  readonly periodOptions = PERIOD_OPTIONS;
  readonly dateRange = () => ({ from: this.date(), to: undefined }) as DateRange | null;
  readonly inputValue = inputValue;
  readonly fmtShort = fmtShort;

  readonly diasEl = viewChild<ElementRef<HTMLInputElement>>('dias');
  readonly pulsoEl = viewChild<ElementRef<HTMLInputElement>>('pulso');

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
    this.resetForm();
  }

  private resetForm(): void {
    this.systolic.set('');
    this.diastolic.set('');
    this.pulse.set('');
    this.glucose.set('');
    this.weight.set('');
    this.isSaving.set(false);
    this.period.set('manha');
    this.date.set(new Date());
  }

  async save(): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);

    const bloodPressure: Record<string, unknown> = {};
    if (this.systolic() && this.diastolic()) {
      bloodPressure[this.period()] = {
        systolic: Number(this.systolic()),
        diastolic: Number(this.diastolic()),
        pulse: this.pulse() ? Number(this.pulse()) : null,
      };
    }

    const glucose: Record<string, unknown> = {};
    if (this.glucose()) {
      glucose[this.period()] = { value: Number(this.glucose()) };
    }

    try {
      await this.vitals.saveDaily({
        date: toYMD(this.date()),
        bloodPressure: Object.keys(bloodPressure).length ? bloodPressure : null,
        glucose: Object.keys(glucose).length ? glucose : null,
        weight: this.weight() ? Number(this.weight()) : null,
      });
      this.toast.success('Sucesso!', 'Registros de saúde atualizados.');
      this.close();
    } catch {
      this.toast.error('Erro', 'Falha ao salvar alguns registros.');
    } finally {
      this.isSaving.set(false);
    }
  }
}