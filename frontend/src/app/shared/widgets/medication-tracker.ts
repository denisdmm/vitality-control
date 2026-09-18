import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { MedicationsService } from '../../core/medications.service';
import type { Medication } from '../../models/medication-vaccine';
import { ButtonComponent } from '../ui/button';
import { DialogComponent } from '../ui/dialog';
import { InputComponent } from '../ui/input';
import { IconComponent } from '../icon.component';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../ui/card';
import { TABLE_IMPORTS } from '../ui/table';
import { SpinnerComponent } from '../ui/spinner';

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

@Component({
  selector: 'app-medication-tracker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent, ButtonComponent, DialogComponent, InputComponent, IconComponent, TABLE_IMPORTS, SpinnerComponent],
  template: `
    <app-card class="flex h-full flex-col">
      <app-card-header class="flex flex-col items-start gap-4">
        <div class="flex w-full flex-row items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <app-icon name="pill" class="h-6 w-6 text-primary" />
            <div>
              <app-card-title>Medicamentos</app-card-title>
              <app-card-description class="hidden sm:block">Sua lista de medicamentos</app-card-description>
            </div>
          </div>
          <button app-button size="sm" class="w-full md:w-auto" (click)="open.set(true)">
            <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
            Adicionar
          </button>
        </div>
      </app-card-header>
      <app-card-content class="flex-1 overflow-y-auto">
        @if (loading()) {
          <app-spinner label="Carregando medicamentos..." />
        } @else if (medications().length > 0) {
          <table app-table>
            <thead app-table-header>
              <tr app-table-row>
                <th app-table-head>Nome</th>
                <th app-table-head class="hidden sm:table-cell">Dosagem</th>
                <th app-table-head>Frequência</th>
                <th app-table-head class="text-right"></th>
              </tr>
            </thead>
            <tbody app-table-body>
              @for (med of medications(); track med.id) {
                <tr app-table-row>
                  <td app-table-cell class="font-medium">{{ med.name }}</td>
                  <td app-table-cell class="hidden sm:table-cell">{{ med.dosage }}</td>
                  <td app-table-cell>{{ med.frequency }}</td>
                  <td app-table-cell class="text-right">
                    <button app-button variant="ghost" size="icon" (click)="remove(med)">
                      <app-icon name="trash2" class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="flex h-full flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <app-icon name="pill" class="mb-4 h-12 w-12" />
            <p class="font-medium">Nenhum medicamento registrado</p>
            <p class="text-sm">Adicione seus medicamentos para organizá-los.</p>
          </div>
        }
      </app-card-content>
    </app-card>

    <app-dialog [open]="open()" (close)="close()">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Novo Medicamento</h2>
        <p class="mt-2 text-sm text-muted-foreground">Adicione um medicamento que você faz uso.</p>
      </div>
      <div class="grid gap-4 px-6">
        <input app-input placeholder="Nome do medicamento" [value]="name()" (input)="name.set(inputValue($event))" />
        <input app-input placeholder="Dosagem (ex: 50mg)" [value]="dosage()" (input)="dosage.set(inputValue($event))" />
        <input app-input placeholder="Frequência (ex: 1 vez ao dia)" [value]="frequency()" (input)="frequency.set(inputValue($event))" />
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="close()">Cancelar</button>
        <button app-button (click)="add()">Salvar</button>
      </div>
    </app-dialog>
  `,
})
export class MedicationTrackerComponent {
  private readonly meds = inject(MedicationsService);
  private readonly toast = inject(ToastService);

  readonly medications = signal<Medication[]>([]);
  readonly loading = signal(true);
  readonly open = signal(false);
  readonly name = signal('');
  readonly dosage = signal('');
  readonly frequency = signal('');
  readonly inputValue = inputValue;

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    try {
      this.medications.set(await this.meds.list());
    } catch {
      this.medications.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  close(): void {
    this.open.set(false);
  }

  async add(): Promise<void> {
    const name = this.name().trim();
    const dosage = this.dosage().trim();
    const frequency = this.frequency().trim();
    if (!name || !dosage || !frequency) return;
    try {
      await this.meds.create({ name, dosage, frequency });
      this.name.set('');
      this.dosage.set('');
      this.frequency.set('');
      this.close();
      await this.load();
    } catch {
      this.toast.error('Erro', 'Não foi possível salvar o medicamento.');
    }
  }

  async remove(med: Medication): Promise<void> {
    try {
      await this.meds.remove(med.id);
      await this.load();
    } catch {
      this.toast.error('Erro', 'Não foi possível remover o medicamento.');
    }
  }
}