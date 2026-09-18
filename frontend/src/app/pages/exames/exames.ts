import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { UsersService } from '../../core/users.service';
import { HealthRecordsService } from '../../core/health-records.service';
import { ExamTypesService } from '../../core/medications.service';
import { fmtIso, toYMD } from '../../core/dates';
import type { HealthRecord, HealthRecordStatus } from '../../models/health-record';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { DialogComponent } from '../../shared/ui/dialog';
import { AlertDialogComponent } from '../../shared/ui/alert-dialog';
import { SelectComponent, SelectOption } from '../../shared/ui/select';
import { ComboboxComponent } from '../../shared/ui/combobox';
import { PopoverComponent } from '../../shared/ui/popover';
import { CalendarComponent } from '../../shared/ui/calendar';
import { InputComponent, LabelComponent } from '../../shared/ui/input';
import { IconComponent } from '../../shared/icon.component';
import { TABLE_IMPORTS } from '../../shared/ui/table';
import type { DateRange } from '../../core/dates';
import type { PublicUser } from '../../models/user';

const STATUS_LABEL: Record<HealthRecordStatus, string> = {
  SOLICITADO: 'Solicitado',
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
};

const STATUS_BADGE: Record<HealthRecordStatus, string> = {
  SOLICITADO: 'border-border bg-transparent text-foreground',
  AGENDADO: 'border-transparent bg-secondary text-secondary-foreground',
  REALIZADO: 'border-transparent bg-primary text-primary-foreground',
};

type ModalMode = 'add' | 'schedule' | 'result';

@Component({
  selector: 'app-exames',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent,
    ButtonComponent, DialogComponent, AlertDialogComponent, SelectComponent, ComboboxComponent,
    PopoverComponent, CalendarComponent, InputComponent, LabelComponent, IconComponent, TABLE_IMPORTS,
  ],
  template: `
    <app-card>
      <app-card-header class="flex flex-col items-start gap-4">
        <div class="flex w-full flex-row items-start justify-between gap-2">
          <div>
            <app-card-title>Gerenciamento de Exames</app-card-title>
            <app-card-description class="hidden sm:block">Gerencie solicitações, agendamentos e resultados.</app-card-description>
          </div>
          <button app-button size="sm" class="w-full md:w-auto" (click)="openModal('add')">
            <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
            Solicitar Exame
          </button>
        </div>
      </app-card-header>
      <app-card-content>
        <div class="inline-flex w-full rounded-lg bg-muted p-1 text-muted-foreground">
          @for (tab of tabs; track tab) {
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:text-foreground focus-visible:outline-none"
              [class]="tabClass(tab)"
              (click)="activeTab.set(tab)"
            >
              <app-icon [name]="tab === 'SOLICITADO' ? 'clock' : tab === 'AGENDADO' ? 'calendar' : 'check'" class="h-4 w-4" />
              {{ STATUS_LABEL[tab] }}s
            </button>
          }
        </div>

        <div class="mt-4">
          @if (recordsFor(activeTab()).length === 0) {
            <div class="flex h-48 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <p>Nenhum exame encontrado com o status "{{ STATUS_LABEL[activeTab()] }}".</p>
            </div>
          } @else {
            <table app-table>
              <thead app-table-header>
                <tr app-table-row>
                  <th app-table-head>Exame</th>
                  <th app-table-head class="hidden sm:table-cell">Solicitado por</th>
                  <th app-table-head>{{ activeTab() === 'SOLICITADO' ? 'Data da Solicitação' : 'Data do Exame' }}</th>
                  @if (activeTab() === 'REALIZADO') {
                    <th app-table-head>Resultado</th>
                  }
                  <th app-table-head class="text-right">Ações</th>
                </tr>
              </thead>
              <tbody app-table-body>
                @for (rec of recordsFor(activeTab()); track rec.id) {
                  <tr app-table-row class="cursor-pointer" (click)="openDetails(rec.id)">
                    <td app-table-cell class="font-medium">{{ rec.name }}</td>
                    <td app-table-cell class="hidden sm:table-cell">{{ rec.requestingDoctorName || '-' }}</td>
                    <td app-table-cell>{{ fmtIso(rec.examDate || rec.requestDate) }}</td>
                    @if (activeTab() === 'REALIZADO') {
                      <td app-table-cell class="max-w-[150px] truncate">{{ rec.result }}</td>
                    }
                    <td app-table-cell class="space-x-1 text-right">
                      @if (activeTab() === 'SOLICITADO') {
                        <button app-button size="sm" variant="outline" (click)="openModal('schedule', rec); stop($event)">
                          <app-icon name="calendar" class="mr-2 h-4 w-4" /> Agendar
                        </button>
                      }
                      @if (activeTab() === 'AGENDADO') {
                        <button app-button size="sm" variant="outline" (click)="openModal('result', rec); stop($event)">
                          <app-icon name="fileText" class="mr-2 h-4 w-4" /> Registrar Resultado
                        </button>
                      }
                      @if (activeTab() === 'REALIZADO') {
                        <button app-button size="sm" variant="outline" (click)="openDetails(rec.id); stop($event)">
                          <app-icon name="arrowRight" class="h-4 w-4" />
                        </button>
                      }
                      <button app-button variant="ghost" size="icon" (click)="askDelete(rec); stop($event)">
                        <app-icon name="trash2" class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </app-card-content>
    </app-card>

    <app-dialog [open]="modalOpen()" (close)="modalOpen.set(false)">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">{{ modalTitle() }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">{{ modalDescription() }}</p>
      </div>
      <div class="grid gap-4 px-6 py-4">
        @if (modalMode() === 'add') {
          <div class="space-y-2">
            <label app-label>Nome do Exame</label>
            <app-combobox [options]="examOptions" [value]="examName()" (valueChange)="examName.set($event)" [placeholder]="'Selecione ou digite um exame...'" [emptyText]="'Nenhum exame encontrado.'" />
          </div>
          <div class="space-y-2">
            <label app-label>Médico Solicitante</label>
            <app-select [options]="doctorOptions()" [placeholder]="'Selecione um médico...'" [(value)]="selectedDoctor" />
          </div>
          @if (selectedDoctor() === 'other') {
            <div class="grid gap-4 rounded-md border p-4">
              <div class="space-y-2">
                <label app-label>Nome do Médico</label>
                <input app-input placeholder="Nome completo" [value]="otherDoctorName()" (input)="otherDoctorName.set(inputValue($event))" />
              </div>
              <div class="space-y-2">
                <label app-label>CRM do Médico</label>
                <input app-input placeholder="CRM" [value]="otherDoctorCrm()" (input)="otherDoctorCrm.set(inputValue($event))" />
              </div>
            </div>
          }
        }
        @if (modalMode() === 'schedule') {
          <div class="space-y-2">
            <label app-label>Data do Agendamento</label>
            <app-popover [open]="calOpen()" (openChange)="calOpen.set($event)">
              <button app-button variant="outline" slot="trigger" class="w-full justify-start text-left font-normal">
                <app-icon name="calendar" class="mr-2 h-4 w-4" />
                {{ examDateLabel() }}
              </button>
              <div slot="panel" class="p-0">
                <app-calendar mode="single" [value]="singleRange()" (valueChange)="onPickExamDate($event)" />
              </div>
            </app-popover>
          </div>
        }
        @if (modalMode() === 'result') {
          <div class="space-y-2">
            <label app-label>Resultado/Observações</label>
            <textarea app-input placeholder="Insira os resultados ou observações importantes do exame." [value]="examResult()" (input)="examResult.set(inputValue($event))"></textarea>
          </div>
        }
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="modalOpen.set(false)">Cancelar</button>
        <button app-button (click)="handleSubmit()">Salvar</button>
      </div>
    </app-dialog>

    <app-alert-dialog [open]="deleteOpen()" (close)="deleteOpen.set(false)">
      <h2 class="text-lg font-semibold">Você tem certeza?</h2>
      <p class="text-sm text-muted-foreground">
        Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro do exame.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <button app-button variant="outline" (click)="deleteOpen.set(false)">Cancelar</button>
        <button app-button variant="destructive" (click)="confirmDelete()">Confirmar</button>
      </div>
    </app-alert-dialog>
  `,
})
export class ExamesComponent {
  private readonly healthRecords = inject(HealthRecordsService);
  private readonly examTypes = inject(ExamTypesService);
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly tabs: HealthRecordStatus[] = ['SOLICITADO', 'AGENDADO', 'REALIZADO'];
  readonly STATUS_LABEL = STATUS_LABEL;
  readonly fmtIso = fmtIso;
  readonly inputValue = (e: Event) => (e.target as HTMLInputElement).value;
  readonly stop = (e: Event) => e.stopPropagation();

  readonly records = signal<HealthRecord[]>([]);
  readonly activeTab = signal<HealthRecordStatus>('SOLICITADO');
  readonly examOptions: SelectOption[] = [];

  readonly modalOpen = signal(false);
  readonly modalMode = signal<ModalMode>('add');
  readonly currentRecord = signal<HealthRecord | null>(null);
  readonly deleteOpen = signal(false);
  readonly recordToDelete = signal<HealthRecord | null>(null);
  readonly calOpen = signal(false);

  readonly examName = signal('');
  readonly examDate = signal<Date | undefined>(undefined);
  readonly examResult = signal('');
  readonly selectedDoctor = signal<string>('');
  readonly otherDoctorName = signal('');
  readonly otherDoctorCrm = signal('');
  readonly doctors = signal<PublicUser[]>([]);

  readonly doctorOptions = (): SelectOption[] => [
    ...this.doctors().map((d) => ({ value: d.id, label: d.fullName })),
    { value: 'other', label: 'Outro' },
  ];

  readonly singleRange = () => ({ from: this.examDate() ?? new Date(), to: undefined }) as DateRange | null;

  readonly modalTitle = () => {
    switch (this.modalMode()) {
      case 'add': return 'Solicitar Novo Exame';
      case 'schedule': return 'Agendar Exame';
      case 'result': return 'Registrar Resultado';
    }
  };
  readonly examDateLabel = () =>
    this.examDate() ? fmtIso(toYMD(this.examDate()!)) : 'Selecione a data';

  tabClass(tab: HealthRecordStatus): string {
    const base =
      'inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:text-foreground focus-visible:outline-none';
    return this.activeTab() === tab
      ? `${base} bg-background text-foreground shadow`
      : `${base} text-muted-foreground`;
  }
  readonly modalDescription = () => {
    switch (this.modalMode()) {
      case 'add': return 'Insira os detalhes do exame que foi solicitado pelo médico.';
      case 'schedule': return 'Insira a data em que o exame foi agendado.';
      case 'result': return 'Insira o resultado ou observações do exame realizado.';
    }
  };

  constructor() {
    void this.loadRecords();
    void this.loadCatalog();
    void this.loadDoctors();
  }

  private async loadRecords(): Promise<void> {
    try {
      const rows = await this.healthRecords.list();
      rows.sort((a, b) => (b.requestDate || '').localeCompare(a.requestDate || ''));
      this.records.set(rows);
    } catch {
      this.records.set([]);
    }
  }

  private async loadCatalog(): Promise<void> {
    try {
      const types = await this.examTypes.list();
      for (const t of types) this.examOptions.push({ value: t.label, label: t.label });
    } catch {
      /* silencioso */
    }
  }

  private async loadDoctors(): Promise<void> {
    const uid = this.auth.user()?.id;
    if (!uid) return;
    try {
      const me = await this.users.me();
      this.doctors.set(me.doctors ?? []);
    } catch {
      this.doctors.set([]);
    }
  }

  recordsFor(status: HealthRecordStatus): HealthRecord[] {
    return this.records().filter((r) => r.status === status);
  }

  openDetails(id: string): void {
    void this.router.navigate(['/exames', id]);
  }

  openModal(mode: ModalMode, rec: HealthRecord | null = null): void {
    this.modalMode.set(mode);
    this.currentRecord.set(rec);
    this.examName.set(mode === 'add' ? '' : rec?.name ?? '');
    this.examDate.set(undefined);
    this.examResult.set('');
    this.selectedDoctor.set('');
    this.otherDoctorName.set('');
    this.otherDoctorCrm.set('');
    this.calOpen.set(false);
    this.modalOpen.set(true);
  }

  onPickExamDate(r: DateRange | null): void {
    if (r?.from) {
      this.examDate.set(r.from);
      this.calOpen.set(false);
    }
  }

  async handleSubmit(): Promise<void> {
    try {
      if (this.modalMode() === 'add') {
        let doctorName = '';
        let doctorCrm = '';
        if (this.selectedDoctor() === 'other') {
          if (!this.otherDoctorName() || !this.otherDoctorCrm()) {
            this.toast.error('Erro', 'Nome e CRM do médico são obrigatórios.');
            return;
          }
          doctorName = this.otherDoctorName();
          doctorCrm = this.otherDoctorCrm();
        } else if (this.selectedDoctor()) {
          const doc = this.doctors().find((d) => d.id === this.selectedDoctor());
          if (doc) {
            doctorName = doc.fullName;
            doctorCrm = doc.crm ?? '';
          }
        }
        if (!this.examName()) {
          this.toast.error('Erro', 'Nome do exame é obrigatório.');
          return;
        }
        await this.healthRecords.create({
          name: this.examName(),
          requestDate: new Date().toISOString(),
          status: 'SOLICITADO',
          requestingDoctorName: doctorName || undefined,
          requestingDoctorCrm: doctorCrm || undefined,
        });
        this.toast.success('Sucesso', 'Exame solicitado adicionado.');
      } else if (this.currentRecord()) {
        const rec = this.currentRecord()!;
        if (this.modalMode() === 'schedule') {
          if (!this.examDate()) {
            this.toast.error('Erro', 'A data do agendamento é obrigatória.');
            return;
          }
          await this.healthRecords.update(rec.id, { examDate: toYMD(this.examDate()!), status: 'AGENDADO' });
          this.toast.success('Sucesso', 'Exame agendado.');
        } else if (this.modalMode() === 'result') {
          if (!this.examResult()) {
            this.toast.error('Erro', 'O resultado é obrigatório.');
            return;
          }
          await this.healthRecords.update(rec.id, { result: this.examResult(), status: 'REALIZADO' });
          this.toast.success('Sucesso', 'Resultado registrado.');
        }
      }
      this.modalOpen.set(false);
      await this.loadRecords();
    } catch {
      this.toast.error('Erro', 'Não foi possível salvar o registro.');
    }
  }

  askDelete(rec: HealthRecord): void {
    this.recordToDelete.set(rec);
    this.deleteOpen.set(true);
  }

  async confirmDelete(): Promise<void> {
    const rec = this.recordToDelete();
    if (rec) {
      try {
        await this.healthRecords.remove(rec.id);
        this.toast.success('Excluído', 'O registro do exame foi removido.');
        await this.loadRecords();
      } catch {
        this.toast.error('Erro', 'Não foi possível excluir o registro.');
      }
    }
    this.deleteOpen.set(false);
    this.recordToDelete.set(null);
  }
}