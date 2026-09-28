import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PrescriptionsService } from '../../core/prescriptions.service';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { VitalsService } from '../../core/vitals.service';
import type { AdminPatient } from '../../models/user';
import type { Prescription, PrescriptionMedication } from '../../models/prescription';
import { BadgeComponent } from '../../shared/ui/badge';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { CheckboxComponent } from '../../shared/ui/checkbox';
import { DialogComponent } from '../../shared/ui/dialog';
import { InputComponent, LabelComponent } from '../../shared/ui/input';
import { SelectComponent, SelectOption } from '../../shared/ui/select';
import { IconComponent } from '../../shared/icon.component';
import { SpinnerComponent } from '../../shared/ui/spinner';
import { TABLE_IMPORTS } from '../../shared/ui/table';

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

@Component({
  selector: 'app-medico-receituario',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, BadgeComponent, ButtonComponent, CardComponent, CardContentComponent,
    CardDescriptionComponent, CardHeaderComponent, CardTitleComponent, CheckboxComponent,
    DialogComponent, InputComponent, LabelComponent, SelectComponent, IconComponent,
    SpinnerComponent, TABLE_IMPORTS,
  ],
  template: `
    <div class="flex flex-1 flex-col gap-6">
      <app-card class="w-full max-w-md">
        <app-card-header>
          <app-card-title>Selecionar Paciente</app-card-title>
          <app-card-description>Escolha um paciente para gerenciar o receituário.</app-card-description>
        </app-card-header>
        <app-card-content>
          <app-select
            [options]="patientOptions()"
            placeholder="Selecione um paciente"
            [value]="selectedId()"
            (valueChange)="onSelect($event)"
          />
        </app-card-content>
      </app-card>

      @if (selectedId()) {
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Receituário de {{ patientName() }}</h1>
            <p class="text-sm text-muted-foreground">Medicamentos ativos: {{ active().length }}</p>
          </div>
          <button app-button (click)="openCreate.set(true)">
            <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
            Nova receita
          </button>
        </div>

        @if (loading()) {
          <app-spinner label="Carregando receituário..." />
        } @else if (prescriptions().length === 0) {
          <app-card>
            <app-card-content>
              <div class="flex flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground">
                <app-icon name="fileText" class="h-12 w-12" />
                <p class="font-medium text-foreground">Nenhuma receita registrada</p>
                <p class="text-sm">Registre a primeira receita deste paciente.</p>
              </div>
            </app-card-content>
          </app-card>
        } @else {
          @for (rx of prescriptions(); track rx.id) {
            <app-card>
              <app-card-header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <app-card-title class="flex flex-wrap items-center gap-2">
                    {{ rx.fileDisplayName }}
                    <span app-badge [variant]="rx.status === 'ATIVA' ? 'default' : 'secondary'">
                      {{ rx.status === 'ATIVA' ? 'Ativa' : 'Encerrada' }}
                    </span>
                  </app-card-title>
                  <app-card-description>Emitida em {{ rx.issuedAt | date: 'dd/MM/yyyy' }}</app-card-description>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <button app-button variant="outline" size="sm" (click)="download(rx)">
                    <app-icon name="download" class="mr-2 h-4 w-4" />
                    Baixar PDF
                  </button>
                  @if (rx.status === 'ATIVA') {
                    <button app-button variant="outline" size="sm" (click)="openMedicationFor(rx)">
                      <app-icon name="pill" class="mr-2 h-4 w-4" />
                      Medicamento
                    </button>
                    @if (rx.doctorId === myId()) {
                      <button app-button variant="ghost" size="sm" (click)="setStatus(rx, 'ENCERRADA')">
                        Encerrar
                      </button>
                    }
                  } @else if (rx.doctorId === myId()) {
                    <button app-button variant="ghost" size="sm" (click)="setStatus(rx, 'ATIVA')">Reabrir</button>
                  }
                </div>
              </app-card-header>
              <app-card-content>
                @if (rx.medications.length === 0) {
                  <p class="text-sm text-muted-foreground">Nenhum medicamento nesta receita.</p>
                } @else {
                  <table app-table>
                    <thead app-table-header>
                      <tr app-table-row>
                        <th app-table-head>Nome</th>
                        <th app-table-head class="hidden sm:table-cell">Dosagem</th>
                        <th app-table-head class="hidden md:table-cell">Frequência</th>
                        <th app-table-head>Origem</th>
                        <th app-table-head>Horários</th>
                      </tr>
                    </thead>
                    <tbody app-table-body>
                      @for (med of rx.medications; track med.id) {
                        <tr app-table-row>
                          <td app-table-cell>
                            <div class="flex flex-wrap items-center gap-1">
                              <span class="font-medium">{{ med.name }}</span>
                              @if (med.continuousUse) {
                                <span app-badge variant="secondary">uso contínuo</span>
                              }
                            </div>
                          </td>
                          <td app-table-cell class="hidden sm:table-cell">{{ med.dosage }}</td>
                          <td app-table-cell class="hidden md:table-cell">{{ med.frequency }}</td>
                          <td app-table-cell>
                            {{ med.prescribedById === myId() ? 'prescrito por você' : 'lançado pelo paciente' }}
                          </td>
                          <td app-table-cell>
                            @if (med.schedules.length > 0) {
                              <span class="font-mono text-sm">{{ times(med) }}</span>
                            } @else {
                              <span class="text-sm text-muted-foreground">Sem horário</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              </app-card-content>
            </app-card>
          }
        }
      }
    </div>

    <app-dialog [open]="openCreate()" (close)="openCreate.set(false)">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Nova receita</h2>
        <p class="mt-2 text-sm text-muted-foreground">O PDF é obrigatório.</p>
      </div>
      <div class="grid gap-4 px-6">
        <div>
          <label app-label>Nome de exibição do arquivo</label>
          <input app-input placeholder="Receita — Dr. Silva.pdf" [value]="fileDisplayName()" (input)="fileDisplayName.set(inputValue($event))" />
        </div>
        <div>
          <label app-label>Arquivo PDF</label>
          <input #pdfInput type="file" accept="application/pdf,.pdf" class="block w-full text-sm" (change)="onFile($event)" />
          @if (fileName()) {
            <p class="mt-1 text-xs text-muted-foreground">{{ fileName() }}</p>
          }
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="openCreate.set(false)">Cancelar</button>
        <button app-button [disabled]="saving()" (click)="createPrescription()">Salvar</button>
      </div>
    </app-dialog>

    <app-dialog [open]="openMedication()" (close)="openMedication.set(false)">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Medicamento prescrito</h2>
        <p class="mt-2 text-sm text-muted-foreground">{{ targetPrescription()?.fileDisplayName }}</p>
      </div>
      <div class="grid gap-4 px-6">
        <div>
          <label app-label>Nome</label>
          <input app-input placeholder="Losartana" [value]="medName()" (input)="medName.set(inputValue($event))" />
        </div>
        <div>
          <label app-label>Dosagem</label>
          <input app-input placeholder="50mg" [value]="medDosage()" (input)="medDosage.set(inputValue($event))" />
        </div>
        <div>
          <label app-label>Frequência</label>
          <input app-input placeholder="1x ao dia" [value]="medFrequency()" (input)="medFrequency.set(inputValue($event))" />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <app-checkbox [checked]="medContinuousUse()" (checkedChange)="medContinuousUse.set($event)" />
          Uso contínuo
        </label>
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="openMedication.set(false)">Cancelar</button>
        <button app-button [disabled]="saving()" (click)="createMedication()">Salvar</button>
      </div>
    </app-dialog>
  `,
})
export class MedicoReceituarioComponent {
  private readonly service = inject(PrescriptionsService);
  private readonly auth = inject(AuthService);
  private readonly vitals = inject(VitalsService);
  private readonly toast = inject(ToastService);
  private readonly pdfInput = viewChild<ElementRef<HTMLInputElement>>('pdfInput');

  readonly patients = signal<AdminPatient[]>([]);
  readonly selectedId = signal('');
  readonly prescriptions = signal<Prescription[]>([]);
  readonly active = signal<PrescriptionMedication[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly inputValue = inputValue;

  readonly openCreate = signal(false);
  readonly openMedication = signal(false);
  readonly targetPrescription = signal<Prescription | null>(null);

  readonly fileDisplayName = signal('');
  readonly fileName = signal('');
  private file: File | null = null;

  readonly medName = signal('');
  readonly medDosage = signal('');
  readonly medFrequency = signal('');
  readonly medContinuousUse = signal(false);

  /** O médico autenticado; usado para marcar "prescrito por você" e o status. */
  readonly myId = computed(() => this.auth.user()?.id ?? '');

  readonly patientOptions = computed<SelectOption[]>(() =>
    this.patients().map((p) => ({ value: p.id, label: p.fullName })),
  );
  readonly patientName = computed(
    () => this.patients().find((p) => p.id === this.selectedId())?.fullName ?? 'Paciente',
  );

  constructor() {
    void this.loadPatients();
  }

  private async loadPatients(): Promise<void> {
    try {
      const list = await this.vitals.patients();
      this.patients.set(list);
    } catch {
      this.toast.error('Erro', 'Não foi possível carregar os pacientes.');
    }
  }

  async onSelect(id: string | null): Promise<void> {
    this.selectedId.set(id ?? '');
    this.prescriptions.set([]);
    this.active.set([]);
    if (!id) return;
    await this.loadPatient(id);
  }

  private async loadPatient(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const [prescriptions, active] = await Promise.all([
        this.service.listForPatient(id),
        this.service.listActiveForPatient(id),
      ]);
      this.prescriptions.set(prescriptions);
      this.active.set(active as PrescriptionMedication[]);
    } catch {
      this.toast.error('Receituário', 'Não foi possível carregar o receituário do paciente.');
    } finally {
      this.loading.set(false);
    }
  }

  times(med: { schedules: { time: string }[] }): string {
    return med.schedules.map((s) => s.time).join(' · ');
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
    this.fileName.set(this.file?.name ?? '');
    if (this.file && !this.fileDisplayName().trim()) this.fileDisplayName.set(this.file.name);
  }

  async createPrescription(): Promise<void> {
    const patientId = this.selectedId();
    if (!this.file) {
      this.toast.error('Receita', 'Selecione o PDF da receita.');
      return;
    }
    const displayName = this.fileDisplayName().trim();
    if (!displayName) {
      this.toast.error('Receita', 'Informe o nome de exibição do arquivo.');
      return;
    }
    this.saving.set(true);
    try {
      await this.service.createForPatient(patientId, this.file, displayName);
      this.toast.success('Receita registrada');
      this.openCreate.set(false);
      this.file = null;
      this.fileName.set('');
      this.fileDisplayName.set('');
      const input = this.pdfInput()?.nativeElement;
      if (input) input.value = '';
      await this.loadPatient(patientId);
    } catch (error) {
      this.toast.error('Receita', message(error, 'Não foi possível registrar a receita.'));
    } finally {
      this.saving.set(false);
    }
  }

  openMedicationFor(rx: Prescription): void {
    this.targetPrescription.set(rx);
    this.medName.set('');
    this.medDosage.set('');
    this.medFrequency.set('');
    this.medContinuousUse.set(false);
    this.openMedication.set(true);
  }

  async createMedication(): Promise<void> {
    const rx = this.targetPrescription();
    if (!rx) return;
    const name = this.medName().trim();
    const dosage = this.medDosage().trim();
    const frequency = this.medFrequency().trim();
    if (!name || !dosage || !frequency) {
      this.toast.error('Medicamento', 'Preencha nome, dosagem e frequência.');
      return;
    }
    this.saving.set(true);
    try {
      await this.service.addMedication(rx.id, {
        name,
        dosage,
        frequency,
        continuousUse: this.medContinuousUse(),
      });
      this.openMedication.set(false);
      this.toast.success('Medicamento prescrito');
      await this.loadPatient(this.selectedId());
    } catch (error) {
      this.toast.error('Medicamento', message(error, 'Não foi possível salvar o medicamento.'));
    } finally {
      this.saving.set(false);
    }
  }

  async download(rx: Prescription): Promise<void> {
    try {
      const blob = await this.service.downloadPdf(rx.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = rx.fileDisplayName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.toast.error('Download', 'Não foi possível baixar o PDF.');
    }
  }

  async setStatus(rx: Prescription, status: 'ATIVA' | 'ENCERRADA'): Promise<void> {
    try {
      await this.service.setStatus(rx.id, status);
      await this.loadPatient(this.selectedId());
    } catch {
      this.toast.error('Receita', 'Não foi possível alterar o status da receita.');
    }
  }
}

function message(error: unknown, fallback: string): string {
  const anyError = error as { error?: { message?: string | string[] } };
  const raw = anyError?.error?.message;
  if (Array.isArray(raw)) return raw.join(', ');
  return typeof raw === 'string' ? raw : fallback;
}
