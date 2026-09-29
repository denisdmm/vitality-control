import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PrescriptionsService } from '../../core/prescriptions.service';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { VitalsService } from '../../core/vitals.service';
import type { AdminPatient } from '../../models/user';
import { formatDuration, type Prescription, type PrescriptionMedication } from '../../models/prescription';
import { BadgeComponent } from '../../shared/ui/badge';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { InputComponent } from '../../shared/ui/input';
import { SelectComponent, SelectOption } from '../../shared/ui/select';
import { IconComponent } from '../../shared/icon.component';
import { SpinnerComponent } from '../../shared/ui/spinner';
import { TABLE_IMPORTS } from '../../shared/ui/table';
import { PrescriptionFormComponent, type PrescriptionFormValue } from '../../shared/widgets/prescription-form';

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

@Component({
  selector: 'app-medico-receituario',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, BadgeComponent, ButtonComponent, CardComponent, CardContentComponent,
    CardDescriptionComponent, CardHeaderComponent, CardTitleComponent, InputComponent,
    SelectComponent, IconComponent, PrescriptionFormComponent, SpinnerComponent,
    TABLE_IMPORTS,
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
                    {{ rx.fileDisplayName ?? 'Receita sem PDF' }}
                    <span app-badge [variant]="rx.status === 'ATIVA' ? 'default' : 'secondary'">
                      {{ rx.status === 'ATIVA' ? 'Ativa' : 'Encerrada' }}
                    </span>
                  </app-card-title>
                  <app-card-description>Emitida em {{ rx.issuedAt | date: 'dd/MM/yyyy' }}</app-card-description>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  @if (rx.hasFile) {
                    <button app-button variant="outline" size="sm" (click)="download(rx)">
                      <app-icon name="download" class="mr-2 h-4 w-4" />
                      Baixar PDF
                    </button>
                  }
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
                        <th app-table-head class="hidden lg:table-cell">Duração</th>
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
                          <td app-table-cell class="hidden lg:table-cell">
                            <span class="text-sm text-muted-foreground">{{ duration(med) }}</span>
                          </td>
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

    <app-prescription-form
      [open]="openCreate()"
      [saving]="saving()"
      (close)="openCreate.set(false)"
      (save)="createPrescription($event)"
    />

    <app-prescription-form
      [open]="openMedication()"
      mode="append"
      [saving]="saving()"
      instanceId="append"
      (close)="openMedication.set(false)"
      (save)="createMedication($event)"
    />
  `,
})
export class MedicoReceituarioComponent {
  private readonly service = inject(PrescriptionsService);
  private readonly auth = inject(AuthService);
  private readonly vitals = inject(VitalsService);
  private readonly toast = inject(ToastService);

  readonly patients = signal<AdminPatient[]>([]);
  readonly selectedId = signal('');
  readonly prescriptions = signal<Prescription[]>([]);
  readonly active = signal<PrescriptionMedication[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly inputValue = inputValue;
  readonly duration = formatDuration;

  readonly openCreate = signal(false);
  readonly openMedication = signal(false);
  readonly targetPrescription = signal<Prescription | null>(null);

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

  async createPrescription(value: PrescriptionFormValue): Promise<void> {
    const patientId = this.selectedId();
    this.saving.set(true);
    try {
      await this.service.createForPatient(
        patientId,
        { medications: value.medications },
        value.file,
        value.fileDisplayName,
      );
      this.toast.success('Receita registrada');
      this.openCreate.set(false);
      await this.loadPatient(patientId);
    } catch (error) {
      this.toast.error('Receita', message(error, 'Não foi possível registrar a receita.'));
    } finally {
      this.saving.set(false);
    }
  }

  openMedicationFor(rx: Prescription): void {
    this.targetPrescription.set(rx);
    this.openMedication.set(true);
  }

  async createMedication(value: PrescriptionFormValue): Promise<void> {
    const rx = this.targetPrescription();
    if (!rx) return;
    this.saving.set(true);
    try {
      await this.service.addMedication(rx.id, value.medications[0]);
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
      link.download = rx.fileDisplayName ?? 'receita.pdf';
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
