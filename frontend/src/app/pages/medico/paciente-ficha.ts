import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DoctorPanelService, type Period } from '../../core/doctor-panel.service';
import { ToastService } from '../../core/toast.service';
import { capitalizeName, fmtIso, fmtIsoShort, toYMD } from '../../core/dates';
import { themeColor } from '../../core/theme';
import type { ClinicalNote, PatientSummary, VitalIndicator } from '../../models/doctor-panel';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { TextareaComponent } from '../../shared/ui/input';
import { SpinnerComponent } from '../../shared/ui/spinner';
import { TABLE_IMPORTS } from '../../shared/ui/table';
import { LineChartComponent, type LineChartOptions } from '../../shared/ui/chart';
import { IconComponent } from '../../shared/icon.component';
import { PatientLinkDialogComponent } from '../../shared/widgets/patient-link-dialog';
import { PeriodPickerDialogComponent } from '../../shared/widgets/period-picker-dialog';

type VitalKey = 'systolic' | 'diastolic' | 'pulse' | 'glucose' | 'weight';

const VITAL_LABELS: Record<VitalKey, string> = {
  systolic: 'Pressão sistólica',
  diastolic: 'Pressão diastólica',
  pulse: 'Pulso',
  glucose: 'Glicemia',
  weight: 'Peso',
};

const VITAL_UNITS: Record<VitalKey, string> = {
  systolic: 'mmHg',
  diastolic: 'mmHg',
  pulse: 'bpm',
  glucose: 'mg/dL',
  weight: 'kg',
};

/** 90 dias encerrando hoje, o mesmo corte padrão do backend. */
function defaultPeriod(): Period {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 89);
  return { from: toYMD(from), to: toYMD(to) };
}

@Component({
  selector: 'app-medico-paciente-ficha',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    TextareaComponent,
    SpinnerComponent,
    TABLE_IMPORTS,
    LineChartComponent,
    IconComponent,
    PatientLinkDialogComponent,
    PeriodPickerDialogComponent,
  ],
  template: `
    <div class="flex flex-1 flex-col gap-6">
      @if (loading()) {
        <div class="flex h-40 items-center justify-center"><app-spinner /></div>
      } @else if (!summary()) {
        <app-card>
          <app-card-content class="flex h-48 flex-col items-center justify-center text-muted-foreground">
            <app-icon name="user" class="mb-4 h-12 w-12" />
            <p class="font-medium">Ficha indisponível.</p>
          </app-card-content>
        </app-card>
      } @else {
        <app-card>
          <app-card-header class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <app-card-title>{{ summary()!.patient.fullName }}</app-card-title>
              <app-card-description>
                Prontuário {{ summary()!.patient.medicalRecordNumber ?? 'sem número' }} ·
                {{ summary()!.linkedToMe ? 'você acompanha este paciente' : 'somente leitura' }}
              </app-card-description>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              @if (!summary()!.linkedToMe) {
                <button app-button (click)="dialogOpen.set(true)">
                  <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
                  {{ hasOtherDoctors() ? 'Assumir ou vincular' : 'Vincular a mim' }}
                </button>
              }
              <button app-button variant="outline" (click)="openPeriod()" [disabled]="loading()">
                <app-icon name="calendar" class="mr-2 h-4 w-4" />
                Período: {{ periodLabel() }}
              </button>
            </div>
          </app-card-header>
          <app-card-content>
            <div class="flex flex-wrap gap-1">
              @for (d of summary()!.doctors; track d.id) {
                <span app-badge variant="secondary">{{ d.fullName }}{{ d.crm ? ' · ' + d.crm : '' }}</span>
              }
              @if (summary()!.doctors.length === 0) {
                <span class="text-sm text-muted-foreground">Sem médicos vinculados.</span>
              }
            </div>
            @if (!summary()!.linkedToMe) {
              <p class="mt-3 text-sm text-muted-foreground">
                Você não é o médico vinculado: pode consultar tudo, mas não pode criar ou alterar
                receitas e medicamentos deste paciente. A consulta fica registrada na trilha de auditoria.
              </p>
            }
          </app-card-content>
        </app-card>

        <app-card>
          <app-card-header>
            <app-card-title>Sinais do período</app-card-title>
            <app-card-description>
              @if (summary()!.vitals.hasRecentMeasurements) {
                {{ fmtIso(summary()!.vitals.from) }} a {{ fmtIso(summary()!.vitals.to) }} ·
                comparado com o período anterior de {{ summary()!.vitals.windowDays }} dias.
              } @else {
                {{ fmtIso(summary()!.vitals.from) }} a {{ fmtIso(summary()!.vitals.to) }}: sem medições.
              }
            </app-card-description>
          </app-card-header>
          <app-card-content class="flex flex-col gap-6">
            @if (summary()!.vitals.hasRecentMeasurements) {
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                @for (key of vitalKeys; track key) {
                  <div class="rounded-lg border p-3">
                    <div class="text-xs text-muted-foreground">{{ label(key) }}</div>
                    <div class="text-lg font-semibold">{{ lastOf(key) }} {{ unit(key) }}</div>
                    <div class="text-xs text-muted-foreground">
                      média {{ avgOf(key) }} · mín {{ minOf(key) }} · máx {{ maxOf(key) }}
                    </div>
                    @if (deltaOf(key) !== null) {
                      <div class="text-xs" [class.text-destructive]="(deltaOf(key) ?? 0) > 0" [class.text-muted-foreground]="(deltaOf(key) ?? 0) <= 0">
                        {{ (deltaOf(key) ?? 0) > 0 ? '+' : '' }}{{ deltaOf(key) }} em relação ao período anterior
                      </div>
                    }
                  </div>
                }
              </div>
              <div class="h-[240px] min-w-0 w-full">
                <app-line-chart [options]="chartOptions()" />
              </div>
            } @else {
              <div class="flex h-24 items-center justify-center text-muted-foreground">
                <app-icon name="trendingUp" class="mr-2 h-5 w-5 opacity-30" />
                Nenhuma medição no período.
              </div>
            }
          </app-card-content>
        </app-card>

        <div class="grid gap-6 lg:grid-cols-2">
          <app-card>
            <app-card-header>
              <app-card-title>Medicamentos ativos</app-card-title>
              <app-card-description>{{ summary()!.medications.length }} em uso contínuo</app-card-description>
            </app-card-header>
            <app-card-content>
              @if (summary()!.medications.length === 0) {
                <p class="text-sm text-muted-foreground">Nenhum medicamento ativo.</p>
              } @else {
                <div class="flex flex-col gap-2">
                  @for (m of summary()!.medications; track m.id) {
                    <div class="rounded-lg border p-3">
                      <div class="font-medium">{{ m.name }} {{ m.dosage }}</div>
                      <div class="text-sm text-muted-foreground">{{ m.frequency }}</div>
                      <div class="mt-1 text-xs">
                        @if (m.schedules.length > 0) {
                          Horários: {{ m.schedules.join(', ') }}
                        } @else {
                          <span class="text-destructive">Sem horário definido</span>
                        }
                        @if (m.prescribedBy) {
                          <span class="text-muted-foreground"> · prescrito por {{ m.prescribedBy.name }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </app-card-content>
          </app-card>

          <app-card>
            <app-card-header>
              <app-card-title>Receitas</app-card-title>
              <app-card-description>Últimas {{ summary()!.prescriptions.length }} emissions</app-card-description>
            </app-card-header>
            <app-card-content>
              @if (summary()!.prescriptions.length === 0) {
                <p class="text-sm text-muted-foreground">Nenhuma receita emitida.</p>
              } @else {
                <div class="overflow-x-auto">
                  <table app-table>
                    <thead app-table-header>
                      <tr app-table-row>
                        <th app-table-head>Data</th>
                        <th app-table-head>Médico</th>
                        <th app-table-head>Medicamentos</th>
                        <th app-table-head>Status</th>
                      </tr>
                    </thead>
                    <tbody app-table-body>
                      @for (rx of summary()!.prescriptions; track rx.id) {
                        <tr app-table-row>
                          <td app-table-cell>{{ fmtIso(rx.issuedAt) }}</td>
                          <td app-table-cell>{{ rx.doctor?.name ?? '—' }}</td>
                          <td app-table-cell>
                            @for (m of rx.medications; track m.id) {
                              <div class="text-sm">{{ m.name }} {{ m.dosage }}</div>
                            }
                          </td>
                          <td app-table-cell>{{ rx.status }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </app-card-content>
          </app-card>
        </div>

        <app-card>
          <app-card-header>
            <app-card-title>Exames</app-card-title>
            <app-card-description>{{ summary()!.exams.length }} registro(s) com subitens</app-card-description>
          </app-card-header>
          <app-card-content class="flex flex-col gap-3">
            @if (summary()!.exams.length === 0) {
              <p class="text-sm text-muted-foreground">Nenhum exame registrado.</p>
            } @else {
              @for (e of summary()!.exams; track e.id) {
                <details class="rounded-lg border p-3">
                  <summary class="cursor-pointer font-medium">
                    {{ e.name }}
                    <span class="text-sm text-muted-foreground">
                      · {{ e.examDate ? fmtIso(e.examDate) : 'sem data de exame' }} · {{ e.status }}
                    </span>
                  </summary>
                  @if (e.result) {
                    <p class="mt-2 text-sm">{{ e.result }}</p>
                  }
                  @if (e.subItems.length > 0) {
                    <table app-table class="mt-2">
                      <thead app-table-header>
                        <tr app-table-row>
                          <th app-table-head>Item</th>
                          <th app-table-head>Resultado</th>
                          <th app-table-head>Referência</th>
                        </tr>
                      </thead>
                      <tbody app-table-body>
                        @for (s of e.subItems; track s.id) {
                          <tr app-table-row>
                            <td app-table-cell>{{ s.name }}</td>
                            <td app-table-cell>{{ s.result }}</td>
                            <td app-table-cell>{{ s.reference }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  }
                </details>
              }
            }
          </app-card-content>
        </app-card>

        <app-card>
          <app-card-header>
            <app-card-title>Anotações clínicas</app-card-title>
            <app-card-description>Escritas pelos médicos que atenderam o paciente</app-card-description>
          </app-card-header>
          <app-card-content class="flex flex-col gap-3">
            <div class="flex flex-col gap-2">
              <textarea
                app-input
                rows="3"
                placeholder="Registrar anotação sobre este paciente"
                [value]="draft()"
                (input)="draft.set(inputValue($event))"></textarea>
              <div class="flex justify-end">
                <button app-button (click)="addNote()" [disabled]="!draft().trim() || savingNote()">
                  <app-icon name="save" class="mr-2 h-4 w-4" />
                  Registrar anotação
                </button>
              </div>
            </div>

            @if (summary()!.notes.length === 0) {
              <p class="text-sm text-muted-foreground">Nenhuma anotação registrada.</p>
            } @else {
              @for (n of summary()!.notes; track n.id) {
                <div class="rounded-lg border p-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="text-sm text-muted-foreground">
                      {{ capitalizeName(n.author.name) }} · {{ fmtIso(n.createdAt) }}
                    </div>
                    <div class="flex gap-1">
                      @if (n.canEdit) {
                        <button app-button variant="ghost" size="sm" (click)="startEdit(n)">
                          <app-icon name="pencil" class="h-4 w-4" />
                        </button>
                      }
                      @if (n.canDelete) {
                        <button app-button variant="ghost" size="sm" (click)="removeNote(n)">
                          <app-icon name="trash2" class="h-4 w-4" />
                        </button>
                      }
                    </div>
                  </div>
                  @if (editingId() === n.id) {
                    <textarea app-input rows="3" class="mt-2" [value]="draft()" (input)="draft.set(inputValue($event))"></textarea>
                    <div class="mt-2 flex justify-end gap-2">
                      <button app-button variant="ghost" size="sm" (click)="cancelEdit()">Cancelar</button>
                      <button app-button size="sm" (click)="saveEdit(n)">Salvar</button>
                    </div>
                  } @else {
                    <p class="mt-1 whitespace-pre-wrap text-sm">{{ n.body }}</p>
                  }
                </div>
              }
            }
          </app-card-content>
        </app-card>
      }
    </div>

    <app-patient-link-dialog
      [open]="dialogOpen()"
      [patientId]="summary()?.patient?.id ?? ''"
      [patientName]="summary()?.patient?.fullName ?? ''"
      [linkedToMe]="summary()?.linkedToMe ?? false"
      [doctors]="summary()?.doctors ?? []"
      (applied)="onLinkApplied()"
      (viewOnly)="closeDialog()"
      (close)="closeDialog()" />

    <app-period-picker-dialog
      [open]="periodOpen()"
      [from]="period().from"
      [to]="period().to"
      (applied)="onPeriod($event)"
      (close)="periodOpen.set(false)" />
  `,
})
export class MedicoPacienteFichaComponent {
  private readonly panel = inject(DoctorPanelService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly fmtIso = fmtIso;
  readonly fmtIsoShort = fmtIsoShort;
  readonly capitalizeName = capitalizeName;
  readonly inputValue = (e: Event) => (e.target as HTMLInputElement | HTMLTextAreaElement).value;

  readonly vitalKeys: VitalKey[] = ['systolic', 'diastolic', 'pulse', 'glucose', 'weight'];
  readonly loading = signal(true);
  readonly summary = signal<PatientSummary | null>(null);
  readonly dialogOpen = signal(false);
  readonly periodOpen = signal(false);
  /** 90 dias encerrando hoje: mesmo padrão do backend quando nada é enviado. */
  readonly period = signal<Period>(defaultPeriod());
  readonly draft = signal('');
  readonly editingId = signal<string | null>(null);
  readonly savingNote = signal(false);

  readonly hasOtherDoctors = computed(() => {
    const me = this.auth.user()?.id;
    return (this.summary()?.doctors ?? []).some((d) => d.id !== me);
  });

  label(key: VitalKey): string {
    return VITAL_LABELS[key];
  }

  unit(key: VitalKey): string {
    return VITAL_UNITS[key];
  }

  private indicator(key: VitalKey): VitalIndicator {
    return this.summary()?.vitals.indicators[key] ?? { last: null, min: null, max: null, avg: null };
  }

  lastOf(key: VitalKey): string {
    return this.fmt(this.indicator(key).last);
  }

  avgOf(key: VitalKey): string {
    return this.fmt(this.indicator(key).avg);
  }

  minOf(key: VitalKey): string {
    return this.fmt(this.indicator(key).min);
  }

  maxOf(key: VitalKey): string {
    return this.fmt(this.indicator(key).max);
  }

  deltaOf(key: VitalKey): number | null {
    return this.summary()?.vitals.averageDelta[key] ?? null;
  }

  /** Série diária: média dos períodos do dia, mesma regra dos widgets de log. */
  readonly chartOptions = computed<LineChartOptions | null>(() => {
    const s = this.summary();
    if (!s || s.vitals.series.length === 0) return null;

    const periods = ['manha', 'tarde', 'noite'] as const;
    const dailyAvg = (values: (number | null)[]): number | null => {
      const nums = values.filter((v): v is number => v !== null);
      return nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)) : null;
    };
    const bp = (field: 'systolic' | 'diastolic') =>
      s.vitals.series.map((v) => dailyAvg(periods.map((p) => v.bloodPressure?.[p]?.[field] ?? null)));
    const glucose = s.vitals.series.map((v) =>
      dailyAvg(periods.map((p) => v.glucose?.[p]?.value ?? null)),
    );

    const labels = s.vitals.series.map((v) => fmtIsoShort(v.date));
    return {
      labels,
      fullLabels: labels,
      height: 240,
      showLegend: true,
      series: [
        { label: 'Sistólica (mmHg)', color: themeColor('chart-1'), data: bp('systolic') },
        { label: 'Diastólica (mmHg)', color: themeColor('chart-2'), data: bp('diastolic') },
        { label: 'Glicemia (mg/dL)', color: themeColor('chart-3'), data: glucose },
        { label: 'Peso (kg)', color: themeColor('chart-4'), data: s.vitals.series.map((v) => v.weight) },
      ],
    };
  });

  constructor() {
    void this.load();
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  async onLinkApplied(): Promise<void> {
    this.closeDialog();
    await this.load();
    this.toast.success('Vínculo atualizado', 'Este paciente já está na sua lista.');
  }

  async addNote(): Promise<void> {
    const body = this.draft().trim();
    if (!body) return;
    this.savingNote.set(true);
    try {
      const note = await this.panel.createNote(this.patientId(), body);
      this.summary.update((s) => (s ? { ...s, notes: [note, ...s.notes] } : s));
      this.draft.set('');
    } catch {
      this.toast.error('Erro', 'Não foi possível registrar a anotação.');
    } finally {
      this.savingNote.set(false);
    }
  }

  startEdit(note: ClinicalNote): void {
    this.editingId.set(note.id);
    this.draft.set(note.body);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.draft.set('');
  }

  async saveEdit(note: ClinicalNote): Promise<void> {
    const body = this.draft().trim();
    if (!body) return;
    try {
      const updated = await this.panel.updateNote(note.id, body);
      this.summary.update((s) =>
        s ? { ...s, notes: s.notes.map((n) => (n.id === note.id ? { ...n, ...updated } : n)) } : s,
      );
      this.cancelEdit();
    } catch {
      this.toast.error('Erro', 'Não foi possível atualizar a anotação.');
    }
  }

  async removeNote(note: ClinicalNote): Promise<void> {
    try {
      await this.panel.deleteNote(note.id);
      this.summary.update((s) => (s ? { ...s, notes: s.notes.filter((n) => n.id !== note.id) } : s));
    } catch {
      this.toast.error('Erro', 'Não foi possível apagar a anotação.');
    }
  }

  private patientId(): string {
    return this.route.snapshot.paramMap.get('patientId') ?? '';
  }

  readonly periodLabel = computed(() => {
    const p = this.period();
    return `${fmtIsoShort(p.from)}–${fmtIsoShort(p.to)}`;
  });

  openPeriod(): void {
    this.periodOpen.set(true);
  }

  async onPeriod(period: Period): Promise<void> {
    this.period.set(period);
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.summary.set(await this.panel.summary(this.patientId(), this.period()));
    } catch {
      this.toast.error('Erro', 'Não foi possível carregar a ficha do paciente.');
      void this.router.navigate(['/medico/pacientes']);
    } finally {
      this.loading.set(false);
    }
  }

  private fmt(value: number | null): string {
    return value === null ? '—' : String(value);
  }
}
