import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { UsersService } from '../../core/users.service';
import { VitalsService } from '../../core/vitals.service';
import { fmtIsoShort, toYMD } from '../../core/dates';
import type { VitalScore } from '../../models/vital';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { DialogComponent } from '../../shared/ui/dialog';
import { PopoverComponent } from '../../shared/ui/popover';
import { CalendarComponent } from '../../shared/ui/calendar';
import { InputComponent, LabelComponent } from '../../shared/ui/input';
import { IconComponent } from '../../shared/icon.component';
import { TABLE_IMPORTS } from '../../shared/ui/table';
import type { DateRange } from '../../core/dates';

function imc(weightKg: number, heightM: number): number {
  return weightKg / (heightM * heightM);
}

function imcCategory(imcValue: number): { label: string; colorClass: string } {
  if (imcValue < 18.5) return { label: 'Abaixo do peso', colorClass: 'text-blue-600' };
  if (imcValue < 25) return { label: 'Normal', colorClass: 'text-emerald-600' };
  if (imcValue < 30) return { label: 'Sobrepeso', colorClass: 'text-amber-600' };
  if (imcValue < 35) return { label: 'Obesidade 1', colorClass: 'font-bold text-orange-600' };
  if (imcValue < 40) return { label: 'Obesidade 2', colorClass: 'font-bold text-destructive' };
  return { label: 'Obesidade 3', colorClass: 'font-black text-destructive' };
}

@Component({
  selector: 'app-peso',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent,
    ButtonComponent, DialogComponent, PopoverComponent, CalendarComponent, InputComponent, LabelComponent,
    IconComponent, RouterLink, TABLE_IMPORTS,
  ],
  template: `
    <div class="mx-auto w-full max-w-5xl space-y-6">
      @if (!height()) {
        <div class="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <app-icon name="info" class="h-5 w-5 shrink-0" />
          <p>Sua altura não está definida no perfil. O cálculo de IMC não será exibido.</p>
          <a routerLink="/minha-area" app-button variant="link" size="sm" class="ml-auto font-bold text-amber-800 underline">
            Definir Altura
          </a>
        </div>
      }

      <app-card>
        <app-card-header class="flex flex-row items-center justify-between">
          <div>
            <app-card-title>Histórico de Peso</app-card-title>
            <app-card-description>Monitore seu peso e índice de massa corporal.</app-card-description>
          </div>
          <button app-button (click)="openAdd()">
            <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
            Registrar Peso
          </button>
        </app-card-header>
        <app-card-content>
          <table app-table>
            <thead app-table-header>
              <tr app-table-row>
                <th app-table-head>Data</th>
                <th app-table-head>Peso (kg)</th>
                <th app-table-head>IMC</th>
                <th app-table-head>Classificação</th>
                <th app-table-head class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody app-table-body>
              @for (entry of entries(); track entry.id) {
                <tr app-table-row>
                  <td app-table-cell>{{ fmtIsoShort(entry.date) }}</td>
                  <td app-table-cell class="font-medium">{{ entry.weight }} kg</td>
                  <td app-table-cell>{{ imcOf(entry) ?? '-' }}</td>
                  <td app-table-cell [class]="categoryOf(entry)?.colorClass">{{ categoryOf(entry)?.label ?? '-' }}</td>
                  <td app-table-cell class="text-right">
                    <button app-button variant="ghost" size="icon" (click)="onDelete(entry)">
                      <app-icon name="trash2" class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr app-table-row>
                  <td app-table-cell class="py-10 text-center text-muted-foreground" colspan="5">Nenhum registro.</td>
                </tr>
              }
            </tbody>
          </table>
        </app-card-content>
      </app-card>
    </div>

    <app-dialog [open]="dialogOpen()" (close)="dialogOpen.set(false)">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Registrar Peso</h2>
        <p class="mt-2 text-sm text-muted-foreground">Insira seu peso atual em quilos.</p>
      </div>
      <div class="grid gap-4 px-6 py-4">
        <div class="space-y-2">
          <label app-label>Data</label>
          <app-popover [open]="calOpen()" (openChange)="calOpen.set($event)">
            <button app-button variant="outline" slot="trigger" class="w-full justify-start">
              <app-icon name="calendar" class="mr-2 h-4 w-4" />
              {{ fmtIsoShort(toYMD(formDate())) }}
            </button>
            <div slot="panel" class="p-0">
              <app-calendar mode="single" [value]="singleRange()" (valueChange)="onPickFormDate($event)" />
            </div>
          </app-popover>
        </div>
        <div class="space-y-2">
          <label app-label>Peso (kg)</label>
          <input app-input type="number" step="0.1" placeholder="ex: 75.5" [value]="weight()" (input)="onWeight(inputValue($event))" />
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="dialogOpen.set(false)">Cancelar</button>
        <button app-button (click)="handleSave()">Salvar</button>
      </div>
    </app-dialog>
  `,
})
export class PesoComponent {
  private readonly vitals = inject(VitalsService);
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly fmtIsoShort = fmtIsoShort;
  readonly toYMD = toYMD;
  readonly inputValue = (e: Event) => (e.target as HTMLInputElement).value;

  readonly entries = signal<VitalScore[]>([]);
  readonly height = signal<number | null>(null);
  readonly dialogOpen = signal(false);
  readonly calOpen = signal(false);
  readonly formDate = signal<Date>(new Date());
  readonly weight = signal('');

  readonly singleRange = () => ({ from: this.formDate(), to: undefined }) as DateRange | null;

  constructor() {
    void this.loadEntries();
    void this.loadHeight();
  }

  private async loadEntries(): Promise<void> {
    try {
      const rows = await this.vitals.list();
      this.entries.set(rows.filter((r) => r.weight != null).sort((a, b) => b.date.localeCompare(a.date)));
    } catch {
      this.entries.set([]);
    }
  }

  private async loadHeight(): Promise<void> {
    const uid = this.auth.user()?.id;
    if (!uid) return;
    try {
      const profile = await this.users.me();
      this.height.set(profile.height ?? null);
    } catch {
      this.height.set(null);
    }
  }

  imcOf(entry: VitalScore): number | null {
    const h = this.height();
    if (!h || entry.weight == null) return null;
    return imc(entry.weight, h);
  }

  categoryOf(entry: VitalScore): { label: string; colorClass: string } | null {
    const v = this.imcOf(entry);
    return v == null ? null : imcCategory(v);
  }

  openAdd(): void {
    this.formDate.set(new Date());
    this.weight.set('');
    this.dialogOpen.set(true);
  }

  onPickFormDate(r: DateRange | null): void {
    if (r?.from) {
      this.formDate.set(r.from);
      this.calOpen.set(false);
    }
  }

  onWeight(v: string): void {
    this.weight.set(v);
  }

  async handleSave(): Promise<void> {
    if (!this.weight()) {
      this.toast.error('Erro', 'Informe o peso.');
      return;
    }
    try {
      await this.vitals.weight(toYMD(this.formDate()), Number(this.weight()));
      this.toast.success('Sucesso');
      this.dialogOpen.set(false);
      this.weight.set('');
      await this.loadEntries();
    } catch {
      this.toast.error('Erro', 'Falha ao salvar.');
    }
  }

  async onDelete(entry: VitalScore): Promise<void> {
    if (!confirm('Excluir?')) return;
    try {
      await this.vitals.remove(toYMD(entry.date));
      await this.loadEntries();
    } catch {
      this.toast.error('Erro', 'Falha ao excluir.');
    }
  }
}