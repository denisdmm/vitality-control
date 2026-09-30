import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonComponent } from '../ui/button';
import { CheckboxComponent } from '../ui/checkbox';
import { DialogComponent } from '../ui/dialog';
import { InputComponent, LabelComponent } from '../ui/input';
import { IconComponent } from '../icon.component';
import type { PrescriptionMedicationDraft } from '../../models/prescription';

export interface PrescriptionFormValue {
  medications: PrescriptionMedicationDraft[];
  file?: File;
  fileDisplayName?: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

interface ScheduleDraft {
  time: string;
}

interface MedicationDraft {
  name: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  continuousUse: boolean;
  schedules: ScheduleDraft[];
}

function emptyMedication(): MedicationDraft {
  return {
    name: '',
    dosage: '',
    frequency: '',
    durationDays: '',
    continuousUse: false,
    schedules: [{ time: '' }],
  };
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

/**
 * Formulário de nova receita: os medicamentos com nome, dose, frequência, duração e
 * horários entram juntos no mesmo POST, e o PDF é um complemento opcional. Fica num
 * widget porque o paciente e o médico registram exatamente a mesma coisa.
 */
@Component({
  selector: 'app-prescription-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent, CheckboxComponent, DialogComponent, InputComponent, LabelComponent, IconComponent,
  ],
  template: `
    <app-dialog [open]="open()" [panelClass]="'sm:max-w-3xl'" (close)="close.emit()">
      <div class="border-b p-6">
        <h2 class="text-lg font-semibold tracking-tight">
          {{ mode() === 'append' ? 'Adicionar medicamento' : 'Nova receita' }}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          @if (mode() === 'append') {
            Informe o medicamento, a dose, os horários e por quanto tempo vai tomar.
          } @else {
            Informe os medicamentos, as doses, os horários e por quanto tempo vai tomar. O PDF é opcional.
          }
        </p>
      </div>

      <div class="grid max-h-[60vh] gap-4 overflow-y-auto p-6">
        @for (entry of drafts(); track entry.key; let i = $index) {
          @let med = entry.med;
          <div class="rounded-lg border p-4">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-sm font-medium">Medicamento {{ i + 1 }}</span>
              @if (drafts().length > 1 && mode() === 'prescription') {
                <button
                  app-button
                  variant="ghost"
                  size="sm"
                  type="button"
                  (click)="removeMedication(i)"
                  [attr.aria-label]="'Remover medicamento ' + (i + 1)"
                >
                  <app-icon name="trash2" class="h-4 w-4" />
                </button>
              }
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label app-label [for]="'med-name-' + entry.key">Nome do medicamento</label>
                <input
                  app-input
                  [id]="'med-name-' + entry.key"
                  placeholder="Losartana"
                  [value]="med.name"
                  (input)="patchMedication(i, 'name', inputValue($event))"
                />
              </div>
              <div>
                <label app-label [for]="'med-dosage-' + entry.key">Dose</label>
                <input
                  app-input
                  [id]="'med-dosage-' + entry.key"
                  placeholder="50mg"
                  [value]="med.dosage"
                  (input)="patchMedication(i, 'dosage', inputValue($event))"
                />
              </div>
              <div>
                <label app-label [for]="'med-frequency-' + entry.key">Frequência</label>
                <input
                  app-input
                  [id]="'med-frequency-' + entry.key"
                  placeholder="1x ao dia"
                  [value]="med.frequency"
                  (input)="patchMedication(i, 'frequency', inputValue($event))"
                />
              </div>
              <div>
                <label app-label [for]="'med-duration-' + entry.key">Duração (dias)</label>
                <input
                  app-input
                  type="number"
                  min="1"
                  max="3650"
                  [id]="'med-duration-' + entry.key"
                  placeholder="30"
                  [value]="med.durationDays"
                  (input)="patchMedication(i, 'durationDays', inputValue($event))"
                />
                <p class="mt-1 text-xs text-muted-foreground">Em branco = uso contínuo, sem prazo.</p>
              </div>
              <div class="flex items-end pb-2">
                <div class="flex items-center gap-2 text-sm">
                  <app-checkbox
                    [checked]="med.continuousUse"
                    (checkedChange)="setContinuousUse(i, $event)"
                  />
                  Uso contínuo
                </div>
              </div>
            </div>

            <div class="mt-4">
              <label app-label>Horários de tomada</label>
              <div class="flex flex-wrap items-center gap-2">
                @for (schedule of med.schedules; track $index; let s = $index) {
                  <div class="flex items-center gap-1">
                    <input
                      app-input
                      class="w-24"
                      type="time"
                      [value]="schedule.time"
                      (input)="setSchedule(i, s, inputValue($event))"
                    />
                    @if (med.schedules.length > 1) {
                      <button
                        app-button
                        variant="ghost"
                        size="sm"
                        type="button"
                        (click)="removeSchedule(i, s)"
                        [attr.aria-label]="'Remover horário ' + (s + 1)"
                      >
                        <app-icon name="x" class="h-4 w-4" />
                      </button>
                    }
                  </div>
                }
                <button app-button variant="outline" size="sm" type="button" (click)="addSchedule(i)">
                  <app-icon name="plusCircle" class="mr-1 h-4 w-4" />
                  Horário
                </button>
              </div>
            </div>
          </div>
        }

        @if (mode() === 'prescription') {
          <button app-button variant="outline" type="button" (click)="addMedication()">
            <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
            Adicionar medicamento
          </button>

          <div class="rounded-lg border border-dashed p-4">
            <p class="text-sm font-medium">PDF da receita (opcional)</p>
            <p class="mt-1 text-xs text-muted-foreground">
              Anexe o documento da receita, se você o tiver em mãos.
            </p>
            <input
              #pdfInput
              type="file"
              accept="application/pdf,.pdf"
              class="mt-3 block w-full text-sm"
              (change)="onFile($event)"
            />
            @if (fileName()) {
              <p class="mt-2 text-xs text-muted-foreground">{{ fileName() }}</p>
            }
            <div class="mt-3">
              <label app-label [for]="'rx-display-name-' + instanceId">Nome do arquivo</label>
              <input
                app-input
                [id]="'rx-display-name-' + instanceId"
                placeholder="Receita — Dr. Silva.pdf"
                [value]="fileDisplayName()"
                (input)="fileDisplayName.set(inputValue($event))"
              />
            </div>
          </div>
        }
      </div>

      <div class="flex items-center justify-end gap-2 border-t p-6">
        <button app-button variant="outline" type="button" (click)="close.emit()">Cancelar</button>
        <button app-button type="button" [disabled]="!canSave() || saving()" (click)="submit()">
          {{ mode() === 'append' ? 'Adicionar' : 'Salvar receita' }}
        </button>
      </div>
    </app-dialog>
  `,
})
export class PrescriptionFormComponent {
  readonly open = input(false);
  /** `prescription` cria a receita com seus medicamentos; `append` acrescenta um item. */
  readonly mode = input<'prescription' | 'append'>('prescription');
  readonly saving = input(false);
  /** Evita colisão de `id` quando o formulário aparece nas duas telas do mesmo app. */
  readonly instanceId = input('rx');
  readonly close = output<void>();
  readonly save = output<PrescriptionFormValue>();

  readonly inputValue = inputValue;

  private readonly pdfInput = viewChild<ElementRef<HTMLInputElement>>('pdfInput');
  private keySeq = 0;

  readonly drafts = signal<{ key: number; med: MedicationDraft }[]>([
    { key: this.nextKey(), med: emptyMedication() },
  ]);
  readonly fileDisplayName = signal('');
  readonly fileName = signal('');
  private file: File | null = null;

  /** Cada item precisa de nome, dose, frequência e ao menos um horário válido. */
  readonly canSave = computed(() => {
    if (this.mode() === 'append' && this.drafts().length !== 1) return false;
    return this.drafts().every(({ med }) => this.isMedicationValid(med));
  });

  private nextKey(): number {
    return ++this.keySeq;
  }

  constructor() {
    // O conteúdo do diálogo é destruído ao fechar, mas o estado do componente
    // sobrevive; sem isso, a próxima abriria com o rascunho anterior.
    effect(() => {
      if (this.open()) this.reset();
    });
  }

  addMedication(): void {
    this.drafts.update((list) => [...list, { key: this.nextKey(), med: emptyMedication() }]);
  }

  removeMedication(index: number): void {
    this.drafts.update((list) => (list.length > 1 ? list.filter((_, i) => i !== index) : list));
  }

  patchMedication(index: number, field: 'name' | 'dosage' | 'frequency' | 'durationDays', value: string): void {
    this.drafts.update((list) =>
      list.map((item, i) => (i === index ? { ...item, med: { ...item.med, [field]: value } } : item)),
    );
  }

  setContinuousUse(index: number, value: boolean): void {
    this.drafts.update((list) =>
      list.map((item, i) => (i === index ? { ...item, med: { ...item.med, continuousUse: value } } : item)),
    );
  }

  addSchedule(medicationIndex: number): void {
    this.drafts.update((list) =>
      list.map((item, i) =>
        i === medicationIndex
          ? { ...item, med: { ...item.med, schedules: [...item.med.schedules, { time: '' }] } }
          : item,
      ),
    );
  }

  removeSchedule(medicationIndex: number, scheduleIndex: number): void {
    this.drafts.update((list) =>
      list.map((item, i) =>
        i === medicationIndex && item.med.schedules.length > 1
          ? {
              ...item,
              med: {
                ...item.med,
                schedules: item.med.schedules.filter((_, s) => s !== scheduleIndex),
              },
            }
          : item,
      ),
    );
  }

  setSchedule(medicationIndex: number, scheduleIndex: number, value: string): void {
    this.drafts.update((list) =>
      list.map((item, i) =>
        i === medicationIndex
          ? {
              ...item,
              med: {
                ...item.med,
                schedules: item.med.schedules.map((s, index) =>
                  index === scheduleIndex ? { time: value } : s,
                ),
              },
            }
          : item,
      ),
    );
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
    this.fileName.set(this.file?.name ?? '');
    if (this.file && !this.fileDisplayName().trim()) this.fileDisplayName.set(this.file.name);
  }

  submit(): void {
    if (!this.canSave()) return;
    const medications: PrescriptionMedicationDraft[] = this.drafts().map(({ med }) => {
      const days = med.durationDays.trim() === '' ? null : Number(med.durationDays);
      return {
        name: med.name.trim(),
        dosage: med.dosage.trim(),
        frequency: med.frequency.trim(),
        durationDays: days !== null && Number.isFinite(days) ? days : null,
        continuousUse: med.continuousUse,
        schedules: dedupe(med.schedules.map((s) => s.time).filter((time) => TIME_PATTERN.test(time))),
      };
    });
    const displayName = this.fileDisplayName().trim();
    this.save.emit({
      medications,
      ...(this.file ? { file: this.file } : {}),
      ...(this.file && displayName ? { fileDisplayName: displayName } : {}),
    });
  }

  /** Limpa o formulário para a próxima abertura, mantendo o PDF fora do caminho. */
  reset(): void {
    this.drafts.set([{ key: this.nextKey(), med: emptyMedication() }]);
    this.file = null;
    this.fileName.set('');
    this.fileDisplayName.set('');
    const input = this.pdfInput()?.nativeElement;
    if (input) input.value = '';
  }

  private isMedicationValid(med: MedicationDraft): boolean {
    if (!med.name.trim() || !med.dosage.trim() || !med.frequency.trim()) return false;
    const times = med.schedules.map((s) => s.time.trim()).filter((time) => time !== '');
    if (times.length === 0) return false;
    if (times.some((time) => !TIME_PATTERN.test(time))) return false;
    if (new Set(times).size !== times.length) return false;
    if (med.durationDays.trim() !== '') {
      const days = Number(med.durationDays);
      if (!Number.isInteger(days) || days < 1 || days > 3650) return false;
    }
    return true;
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
