import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { UsersService } from '../../core/users.service';
import { capitalizeName } from '../../core/dates';
import type { PublicUser } from '../../models/user';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { DialogComponent } from '../../shared/ui/dialog';
import { AlertDialogComponent } from '../../shared/ui/alert-dialog';
import { AvatarComponent, AvatarFallbackComponent, AvatarImageComponent } from '../../shared/ui/avatar';
import { InputComponent, LabelComponent } from '../../shared/ui/input';
import { SelectComponent, SelectOption } from '../../shared/ui/select';
import { MultiSelectComponent, MultiSelectOption } from '../../shared/ui/multi-select';
import { BadgeComponent } from '../../shared/ui/badge';
import { IconComponent } from '../../shared/icon.component';
import { TABLE_IMPORTS } from '../../shared/ui/table';

const ONE_MINUTE = 60 * 1000;

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'PACIENTE', label: 'Paciente' },
  { value: 'MEDICO', label: 'Médico' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
];

const TIMEOUT_OPTIONS: SelectOption[] = [
  { value: String(ONE_MINUTE), label: '1 minuto' },
  { value: String(2 * ONE_MINUTE), label: '2 minutos' },
  { value: String(5 * ONE_MINUTE), label: '5 minutos' },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent,
    ButtonComponent, DialogComponent, AlertDialogComponent, AvatarComponent, AvatarFallbackComponent, AvatarImageComponent,
    InputComponent, LabelComponent, SelectComponent, MultiSelectComponent, BadgeComponent, IconComponent, TABLE_IMPORTS,
  ],
  template: `
    <app-card>
      <app-card-header class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <app-card-title>Gerenciamento de Usuários</app-card-title>
          <app-card-description>Adicione, visualize e remova usuários do sistema.</app-card-description>
        </div>
        <button app-button size="sm" (click)="openAdd()">
          <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
          Novo Usuário
        </button>
      </app-card-header>
      <app-card-content>
        @if (loading()) {
          <div class="flex h-40 items-center justify-center text-muted-foreground">Carregando...</div>
        } @else {
          <div class="overflow-x-auto">
            <table app-table>
              <thead app-table-header>
                <tr app-table-row>
                  <th app-table-head>Nome Completo</th>
                  <th app-table-head class="hidden md:table-cell">Nº Prontuário / CRM</th>
                  <th app-table-head class="hidden sm:table-cell">Perfil</th>
                  <th app-table-head>Usuário (Login)</th>
                  <th app-table-head class="text-right">Ações</th>
                </tr>
              </thead>
              <tbody app-table-body>
                @for (u of users(); track u.id) {
                  <tr app-table-row>
                    <td app-table-cell class="flex items-center gap-2 font-medium">
                      <app-avatar class="h-8 w-8">
                        @if (u.photoUrl) {
                          <app-avatar-image [src]="u.photoUrl" [alt]="u.fullName" />
                        } @else {
                          <app-avatar-fallback>{{ u.fullName.charAt(0) }}</app-avatar-fallback>
                        }
                      </app-avatar>
                      {{ u.fullName }}
                    </td>
                    <td app-table-cell class="hidden md:table-cell">
                      {{ u.role === 'MEDICO' ? 'CRM: ' + u.crm : u.medicalRecordNumber }}
                    </td>
                    <td app-table-cell class="hidden sm:table-cell">
                      <span app-badge variant="secondary">{{ capitalizeName(u.role) }}</span>
                    </td>
                    <td app-table-cell>{{ u.name }}</td>
                    <td app-table-cell class="space-x-1 text-right">
                      <button app-button variant="outline" size="icon" (click)="openEdit(u)">
                        <app-icon name="pencil" class="h-4 w-4" />
                      </button>
                      <button app-button variant="destructive" size="icon" (click)="askDelete(u)">
                        <app-icon name="trash2" class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </app-card-content>
    </app-card>

    <app-dialog [open]="dialogOpen()" (close)="dialogOpen.set(false)">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">{{ editingId() ? 'Editar Usuário' : 'Criar Novo Usuário' }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ editingId() ? 'Altere as informações do usuário. O nome de usuário não pode ser alterado.' : 'Insira os detalhes para criar uma nova conta.' }}
        </p>
      </div>
      <div class="grid max-h-[70vh] gap-4 overflow-y-auto px-6">
        <div class="flex flex-col items-center gap-4">
          <app-avatar class="h-24 w-24">
            @if (photoUrl()) {
              <app-avatar-image [src]="photoUrl()" alt="Foto do usuário" />
            } @else {
              <app-avatar-fallback><app-icon name="user" class="h-10 w-10 text-muted-foreground" /></app-avatar-fallback>
            }
          </app-avatar>
          <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFile($event)" />
          <button app-button variant="outline" type="button" (click)="fileInput.click()">
            <app-icon name="upload" class="mr-2 h-4 w-4" />
            Carregar Foto
          </button>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label app-label>Nome Completo</label>
            <input app-input placeholder="Nome completo" [value]="fullName()" (input)="fullName.set(capitalizeName(inputValue($event)))" />
          </div>
          <div>
            <label app-label>Nome Social (Opcional)</label>
            <input app-input placeholder="Nome social" [value]="socialName()" (input)="socialName.set(capitalizeName(inputValue($event)))" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label app-label>Nº do Prontuário</label>
            <input app-input placeholder="Número do prontuário" [value]="medicalRecordNumber()" (input)="medicalRecordNumber.set(inputValue($event))" />
          </div>
          <div>
            <label app-label>Perfil</label>
            <app-select [options]="roleOptions" [placeholder]="'Selecione o perfil'" [(value)]="role" />
          </div>
        </div>
        @if (role() === 'MEDICO') {
          <div>
            <label app-label>CRM</label>
            <input app-input placeholder="CRM do médico" [value]="crm()" (input)="crm.set(inputValue($event))" />
          </div>
        }
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label app-label>Nome de Usuário (Login)</label>
            <input app-input placeholder="Usuário para login" [value]="name()" [disabled]="!!editingId()"
              (input)="name.set(inputValue($event))" />
          </div>
          @if (!editingId()) {
            <div>
              <label app-label>Senha</label>
              <input app-input type="password" placeholder="Senha de acesso" [value]="password()" (input)="password.set(inputValue($event))" />
            </div>
          }
        </div>
        @if (role() === 'PACIENTE') {
          <div>
            <label app-label>Médicos Vinculados</label>
            <app-multi-select [options]="doctorOptions()" [placeholder]="'Selecione médicos...'"
              [value]="linkedDoctors()" (valueChange)="onDoctorsChange($event)" />
          </div>
        }
        <div>
          <label app-label>Logout por Inatividade</label>
          <app-select [options]="timeoutOptions" [(value)]="inactivityTimeout" />
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="dialogOpen.set(false)">Cancelar</button>
        <button app-button (click)="save()">{{ editingId() ? 'Salvar Alterações' : 'Salvar' }}</button>
      </div>
    </app-dialog>

    <app-alert-dialog [open]="!!deleteTarget()" (close)="deleteTarget.set(null)">
      <h2 class="text-lg font-semibold">Você tem certeza?</h2>
      <p class="mt-2 text-sm text-muted-foreground">
        Esta ação não pode ser desfeita. Isso irá excluir permanentemente a conta do usuário e remover seus dados.
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <button app-button variant="outline" (click)="deleteTarget.set(null)">Cancelar</button>
        <button app-button variant="destructive" (click)="doDelete()">Continuar</button>
      </div>
    </app-alert-dialog>
  `,
})
export class AdminUsersComponent {
  private readonly usersSvc = inject(UsersService);
  private readonly toast = inject(ToastService);

  readonly roleOptions = ROLE_OPTIONS;
  readonly timeoutOptions = TIMEOUT_OPTIONS;
  readonly capitalizeName = capitalizeName;
  readonly inputValue = (e: Event) => (e.target as HTMLInputElement).value;

  readonly users = signal<PublicUser[]>([]);
  readonly loading = signal(true);

  readonly dialogOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly fullName = signal('');
  readonly socialName = signal('');
  readonly medicalRecordNumber = signal('');
  readonly crm = signal('');
  readonly photoUrl = signal('');
  readonly role = signal<string | null>('PACIENTE');
  readonly name = signal('');
  readonly password = signal('');
  readonly inactivityTimeout = signal<string | null>(String(ONE_MINUTE));
  readonly linkedDoctors = signal<string[]>([]);
  readonly doctorsTouched = signal(false);

  readonly deleteTarget = signal<PublicUser | null>(null);

  readonly doctorOptions = computed<MultiSelectOption[]>(() =>
    this.users()
      .filter((u) => u.role === 'MEDICO')
      .map((u) => ({ value: u.id, label: u.fullName })),
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.users.set(await this.usersSvc.findAll());
    } catch {
      this.toast.error('Erro', 'Não foi possível carregar os usuários.');
    } finally {
      this.loading.set(false);
    }
  }

  openAdd(): void {
    this.editingId.set(null);
    this.fullName.set('');
    this.socialName.set('');
    this.medicalRecordNumber.set('');
    this.crm.set('');
    this.photoUrl.set('');
    this.role.set('PACIENTE');
    this.name.set('');
    this.password.set('');
    this.inactivityTimeout.set(String(ONE_MINUTE));
    this.linkedDoctors.set([]);
    this.doctorsTouched.set(false);
    this.dialogOpen.set(true);
  }

  openEdit(u: PublicUser): void {
    this.editingId.set(u.id);
    this.fullName.set(u.fullName || '');
    this.socialName.set(u.socialName || '');
    this.medicalRecordNumber.set(u.medicalRecordNumber || '');
    this.crm.set(u.crm || '');
    this.photoUrl.set(u.photoUrl || '');
    this.role.set(u.role);
    this.name.set(u.name);
    this.password.set('');
    this.inactivityTimeout.set(String(u.inactivityTimeout || ONE_MINUTE));
    this.linkedDoctors.set([]);
    this.doctorsTouched.set(false);
    this.dialogOpen.set(true);
  }

  onDoctorsChange(ids: string[]): void {
    this.linkedDoctors.set(ids);
    this.doctorsTouched.set(true);
  }

  async onFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      this.photoUrl.set(await readFileAsDataUrl(file));
    } catch {
      this.toast.error('Erro', 'Não foi possível ler a imagem.');
    }
  }

  async save(): Promise<void> {
    const role = this.role() ?? 'PACIENTE';
    const editing = this.editingId();

    if (!editing && (!this.name() || !this.password() || !this.fullName() || !this.medicalRecordNumber())) {
      this.toast.error('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (editing && (!this.fullName() || !this.medicalRecordNumber())) {
      this.toast.error('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (role === 'MEDICO' && !this.crm()) {
      this.toast.error('Erro', 'CRM é obrigatório para médicos.');
      return;
    }

    const doctorIds = this.linkedDoctors();
    try {
      if (editing) {
        const dto: Record<string, unknown> = {
          fullName: this.fullName(),
          socialName: this.socialName(),
          medicalRecordNumber: this.medicalRecordNumber(),
          crm: role === 'MEDICO' ? this.crm() : null,
          role,
          photoUrl: this.photoUrl(),
          inactivityTimeout: Number(this.inactivityTimeout()),
        };
        if (role !== 'PACIENTE' || this.doctorsTouched()) {
          dto['doctorIds'] = doctorIds;
          dto['keepDoctorIdsIntact'] = false;
        }
        await this.usersSvc.update(editing, dto);
        this.toast.success('Sucesso', 'Usuário atualizado com sucesso.');
      } else {
        const dto: Record<string, unknown> = {
          name: this.name().trim(),
          password: this.password().trim(),
          fullName: this.fullName(),
          socialName: this.socialName(),
          medicalRecordNumber: this.medicalRecordNumber(),
          role,
          photoUrl: this.photoUrl(),
          inactivityTimeout: Number(this.inactivityTimeout()),
        };
        if (role === 'MEDICO') dto['crm'] = this.crm().trim();
        if (role === 'PACIENTE' && doctorIds.length) dto['doctorIds'] = doctorIds;
        await this.usersSvc.create(dto);
        this.toast.success('Sucesso', 'Usuário criado com sucesso.');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      this.toast.error('Erro', 'Não foi possível salvar o usuário.');
    }
  }

  askDelete(u: PublicUser): void {
    this.deleteTarget.set(u);
  }

  async doDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    try {
      await this.usersSvc.remove(target.id);
      this.toast.success('Excluído', 'Usuário removido.');
      this.deleteTarget.set(null);
      await this.load();
    } catch {
      this.toast.error('Erro', 'Não foi possível excluir o usuário.');
    }
  }
}