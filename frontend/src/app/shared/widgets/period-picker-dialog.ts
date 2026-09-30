import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { fmtShort, parseIsoDate, toYMD } from '../../core/dates';
import { ButtonComponent } from '../ui/button';
import { CalendarComponent } from '../ui/calendar';
import { DialogComponent } from '../ui/dialog';
import { LabelComponent } from '../ui/input';
import { PopoverComponent } from '../ui/popover';
import { IconComponent } from '../icon.component';

/** Mesmas regras do backend (`SUMMARY_MAX_WINDOW_DAYS`), validadas antes do request. */
export const MAX_PERIOD_DAYS = 365;

export interface PeriodChoice {
  from: string;
  to: string;
}

@Component({
  selector: 'app-period-picker-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CalendarComponent, DialogComponent, LabelComponent, PopoverComponent, IconComponent],
  template: `
    <app-dialog [open]="open()" (close)="cancel()" panelClass="sm:max-w-[540px]">
      <div class="flex flex-col gap-5 p-6">
        <div>
          <h2 class="text-lg font-semibold leading-none tracking-tight">Período dos sinais</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            Escolha o intervalo da biometria. Os indicadores são comparados com o período
            imediatamente anterior, do mesmo tamanho.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <label app-label>Início</label>
            <app-popover [open]="fromOpen()" (openChange)="fromOpen.set($event)">
              <button app-button variant="outline" slot="trigger" class="w-full justify-start text-left font-normal">
                <app-icon name="calendar" class="mr-2 h-4 w-4" />
                {{ draftFrom() ? fmtShort(parseIsoDate(draftFrom())) : 'Selecionar' }}
              </button>
              <div slot="panel" class="p-0">
                <app-calendar mode="single" [value]="fromRange()" (valueChange)="onPick('from', $event)" />
              </div>
            </app-popover>
          </div>

          <div class="space-y-2">
            <label app-label>Fim</label>
            <app-popover [open]="toOpen()" (openChange)="toOpen.set($event)">
              <button app-button variant="outline" slot="trigger" class="w-full justify-start text-left font-normal">
                <app-icon name="calendar" class="mr-2 h-4 w-4" />
                {{ draftTo() ? fmtShort(parseIsoDate(draftTo())) : 'Selecionar' }}
              </button>
              <div slot="panel" class="p-0">
                <app-calendar mode="single" [value]="toRange()" (valueChange)="onPick('to', $event)" />
              </div>
            </app-popover>
          </div>
        </div>

        @if (error()) {
          <p class="flex items-center gap-2 text-sm text-destructive">
            <app-icon name="triangleAlert" class="h-4 w-4 shrink-0" />
            {{ error() }}
          </p>
        }

        <div class="flex justify-end gap-2">
          <button app-button variant="outline" (click)="cancel()">Cancelar</button>
          <button app-button (click)="apply()" [disabled]="!draftFrom() || !draftTo()">Aplicar</button>
        </div>
      </div>
    </app-dialog>
  `,
})
export class PeriodPickerDialogComponent {
  readonly open = input(false);
  readonly from = input<string>('');
  readonly to = input<string>('');

  readonly applied = output<PeriodChoice>();
  readonly close = output<void>();

  readonly fmtShort = fmtShort;
  readonly parseIsoDate = parseIsoDate;
  readonly fromOpen = signal(false);
  readonly toOpen = signal(false);
  readonly error = signal<string | null>(null);

  /** Cópia de trabalho: o período só vale quando o médico confirma. */
  readonly draftFrom = signal('');
  readonly draftTo = signal('');

  readonly fromRange = computed(
    () => (this.draftFrom() ? { from: parseIsoDate(this.draftFrom()), to: undefined } : null),
  );
  readonly toRange = computed(
    () => (this.draftTo() ? { from: parseIsoDate(this.draftTo()), to: undefined } : null),
  );

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.draftFrom.set(this.from());
      this.draftTo.set(this.to());
      this.error.set(null);
    });
  }

  onPick(which: 'from' | 'to', range: { from?: Date } | null): void {
    if (!range?.from) return;
    (which === 'from' ? this.fromOpen : this.toOpen).set(false);
    (which === 'from' ? this.draftFrom : this.draftTo).set(toYMD(range.from));
    this.error.set(null);
  }

  apply(): void {
    const problem = this.validate(this.draftFrom(), this.draftTo());
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.close.emit();
    this.applied.emit({ from: this.draftFrom(), to: this.draftTo() });
  }

  cancel(): void {
    this.error.set(null);
    this.fromOpen.set(false);
    this.toOpen.set(false);
    this.close.emit();
  }

  /** Mesmas regras do backend: início anterior a hoje, não depois do fim, até 365 dias. */
  private validate(from: string, to: string): string | null {
    if (!from || !to) return 'Escolha a data de início e a data de fim.';
    const start = parseIsoDate(from);
    const end = parseIsoDate(to);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start > end) return 'A data inicial não pode ser maior que a data final.';
    if (start.getTime() === today.getTime()) return 'A data inicial não pode ser o dia atual.';
    if (end.getTime() > today.getTime()) return 'A data final não pode ser futura.';
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    if (days > MAX_PERIOD_DAYS) return `O período não pode passar de ${MAX_PERIOD_DAYS} dias.`;
    return null;
  }
}