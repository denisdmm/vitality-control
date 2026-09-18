import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { UsersService } from '../../core/users.service';
import { capitalizeName } from '../../core/dates';
import type { PublicUser } from '../../models/user';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardFooterComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { AvatarComponent, AvatarFallbackComponent, AvatarImageComponent } from '../../shared/ui/avatar';
import { InputComponent, LabelComponent } from '../../shared/ui/input';
import { SelectComponent, SelectOption } from '../../shared/ui/select';
import { IconComponent } from '../../shared/icon.component';

const ONE_MINUTE = 60 * 1000;

const TIMEOUT_OPTIONS: SelectOption[] = [
  { value: String(ONE_MINUTE), label: '1 minuto' },
  { value: String(2 * ONE_MINUTE), label: '2 minutos' },
  { value: String(5 * ONE_MINUTE), label: '5 minutos' },
];

@Component({
  selector: 'app-minha-area',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent, CardFooterComponent,
    ButtonComponent, AvatarComponent, AvatarFallbackComponent, AvatarImageComponent, InputComponent, LabelComponent,
    SelectComponent, IconComponent,
  ],
  template: `
    <div class="flex w-full flex-col items-center gap-6">
      <app-card class="w-full max-w-2xl shadow-lg">
        <app-card-header class="items-center text-center">
          <div class="relative mb-4">
            <app-avatar class="h-24 w-24 border-2 border-primary">
              @if (photoUrl()) {
                <app-avatar-image [src]="photoUrl()" [alt]="fullName()" />
              } @else {
                <app-avatar-fallback class="text-4xl">{{ initial() }}</app-avatar-fallback>
              }
            </app-avatar>
            <button app-button size="icon" variant="outline" class="absolute bottom-0 right-0 h-8 w-8 rounded-full">
              <app-icon name="camera" class="h-4 w-4" />
              <span class="sr-only">Alterar avatar</span>
            </button>
          </div>
          <app-card-title class="text-2xl md:text-3xl">{{ fullName() }}</app-card-title>
          <app-card-description>Gerencie suas informações pessoais e de saúde.</app-card-description>
        </app-card-header>
        <app-card-content class="space-y-6">
          <div class="space-y-2">
            <label app-label>URL da Foto</label>
            <input app-input [value]="photoUrl()" (input)="photoUrl.set(inputValue($event))" placeholder="https://exemplo.com/sua-foto.jpg" />
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label app-label>Nome Completo</label>
              <input app-input [value]="fullName()" (input)="fullName.set(capitalizeName(inputValue($event)))" placeholder="Seu nome completo" />
            </div>
            <div class="space-y-2">
              <label app-label>Nome Social (Opcional)</label>
              <input app-input [value]="socialName()" (input)="socialName.set(capitalizeName(inputValue($event)))" placeholder="Seu nome social" />
            </div>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label app-label>Email</label>
              <input app-input type="email" [value]="email()" (input)="email.set(inputValue($event))" placeholder="seu.email@exemplo.com" />
            </div>
            <div class="space-y-2">
              <label app-label class="flex items-center gap-2">
                <app-icon name="ruler" class="h-4 w-4" /> Altura (m)
              </label>
              <input app-input type="number" step="0.01" [value]="height()" (input)="height.set(inputValue($event))" placeholder="ex: 1.75" />
            </div>
          </div>
          <div class="space-y-2">
            <label app-label>Segurança</label>
            <div class="flex flex-col items-start gap-4 rounded-lg border p-3 sm:flex-row sm:items-center">
              <app-icon name="shield" class="h-6 w-6 text-muted-foreground" />
              <div class="flex-1">
                <p class="font-medium">Senha</p>
                <p class="text-sm text-muted-foreground">Para sua segurança, a senha só pode ser alterada através de um processo de recuperação.</p>
              </div>
              <button app-button variant="secondary" size="sm" class="w-full sm:w-auto" disabled>Alterar Senha</button>
            </div>
          </div>
          <div class="space-y-2">
            <label app-label>Sessão</label>
            <div class="flex flex-col items-start gap-4 rounded-lg border p-3 sm:flex-row sm:items-center">
              <app-icon name="timer" class="h-6 w-6 text-muted-foreground" />
              <div class="flex-1">
                <p class="font-medium">Logout por Inatividade</p>
                <p class="text-sm text-muted-foreground">O sistema encerrará a sessão após este período de inatividade.</p>
              </div>
              <app-select [options]="timeoutOptions" [(value)]="inactivityTimeout" class="w-full sm:w-[150px]" />
            </div>
          </div>
        </app-card-content>
        <app-card-footer class="border-t px-6 py-4">
          <button app-button (click)="saveChanges()" [disabled]="isLoading()">
            <app-icon name="save" class="mr-2 h-4 w-4" />
            {{ isLoading() ? 'Salvando...' : 'Salvar Alterações' }}
          </button>
        </app-card-footer>
      </app-card>

      @if (isPatient()) {
        <app-card class="w-full max-w-2xl shadow-lg">
          <app-card-header>
            <div class="flex items-center gap-3">
              <app-icon name="briefcaseMedical" class="h-6 w-6 text-primary" />
              <div>
                <app-card-title>Meus Médicos</app-card-title>
                <app-card-description>Médicos vinculados ao seu perfil.</app-card-description>
              </div>
            </div>
          </app-card-header>
          <app-card-content>
            @if (doctors().length > 0) {
              <div class="space-y-4">
                @for (doctor of doctors(); track doctor.id) {
                  <div class="flex items-center gap-4 rounded-md border p-2">
                    <app-avatar class="h-12 w-12">
                      @if (doctor.photoUrl) {
                        <app-avatar-image [src]="doctor.photoUrl" [alt]="doctor.fullName" />
                      } @else {
                        <app-avatar-fallback>{{ doctor.fullName.charAt(0) }}</app-avatar-fallback>
                      }
                    </app-avatar>
                    <div class="flex-1">
                      <p class="font-semibold">{{ doctor.fullName }}</p>
                      <p class="text-sm text-muted-foreground">CRM: {{ doctor.crm }}</p>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="py-4 text-center text-muted-foreground">Nenhum médico vinculado ao seu perfil.</p>
            }
          </app-card-content>
        </app-card>
      }
    </div>
  `,
})
export class MinhaAreaComponent {
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly timeoutOptions = TIMEOUT_OPTIONS;
  readonly capitalizeName = capitalizeName;
  readonly inputValue = (e: Event) => (e.target as HTMLInputElement).value;

  readonly fullName = signal('');
  readonly socialName = signal('');
  readonly email = signal('');
  readonly photoUrl = signal('');
  readonly height = signal('');
  readonly inactivityTimeout = signal<string | null>(String(ONE_MINUTE));
  readonly isLoading = signal(true);
  readonly isPatient = signal(false);
  readonly doctors = signal<PublicUser[]>([]);

  readonly initial = () => this.fullName().charAt(0).toUpperCase() || 'U';

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const me = await this.users.me();
      this.fullName.set(me.fullName || '');
      this.socialName.set(me.socialName || '');
      this.email.set(me.email || `${me.name.toLowerCase().replace(' ', '.')}@email.com`);
      this.photoUrl.set(me.photoUrl || '');
      this.height.set(me.height ? String(me.height) : '');
      this.inactivityTimeout.set(String(me.inactivityTimeout || ONE_MINUTE));
      this.isPatient.set(me.role === 'PACIENTE');
      this.doctors.set(me.doctors ?? []);
    } catch {
      this.toast.error('Erro', 'Não foi possível carregar os dados do usuário.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveChanges(): Promise<void> {
    this.isLoading.set(true);
    try {
      const timeoutValue = Number(this.inactivityTimeout());
      await this.users.updateMe({
        fullName: this.fullName(),
        socialName: this.socialName(),
        email: this.email(),
        photoUrl: this.photoUrl(),
        height: this.height() ? Number(this.height()) : null,
        inactivityTimeout: timeoutValue,
      });
      const user = this.auth.user();
      if (user) {
        const updated = { ...user, fullName: this.fullName(), photoUrl: this.photoUrl(), inactivityTimeout: timeoutValue };
        this.auth.user.set(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        localStorage.setItem('inactivityTimeout', String(timeoutValue));
      }
      this.toast.success('Sucesso!', 'Suas informações foram atualizadas.');
      await this.load();
    } catch {
      this.toast.error('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      this.isLoading.set(false);
    }
  }
}