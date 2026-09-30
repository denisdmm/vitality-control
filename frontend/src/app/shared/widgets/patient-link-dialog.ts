import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { DoctorPanelService } from '../../core/doctor-panel.service';
import { ToastService } from '../../core/toast.service';
import { capitalizeName } from '../../core/dates';
import type { LinkState, PanelDoctor } from '../../models/doctor-panel';
import { ButtonComponent } from '../ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../ui/card';
import { DialogComponent } from '../ui/dialog';
import { IconComponent } from '../icon.component';

/**
 * Diálogo único de vínculo: adicionar aos meus, assumir (tira os outros
 * médicos) ou apenas visualizar. Nenhuma chamada é feita antes da escolha.
 */
@Component({
  selector: 'app-patient-link-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    DialogComponent,
    IconComponent,
  ],
  template: `
    <app-dialog [open]="open()" (close)="close.emit()" panelClass="sm:max-w-lg">
      <app-card class="border-0">
        <app-card-header>
          <app-card-title>{{ patientName() }}</app-card-title>
          <app-card-description>
            @if (linkedToMe()) {
              Este paciente já está na sua lista.
            } @else if (otherDoctors().length > 0) {
              Este paciente também é atendido por
              {{ otherDoctorNames() }}. Escolha o que deseja fazer:
            } @else {
              Este paciente ainda não está na sua lista.
            }
          </app-card-description>
        </app-card-header>
        <app-card-content class="flex flex-col gap-2">
          @if (linkedToMe()) {
            <button app-button class="w-full" (click)="doLink()" [disabled]="busy()">
              <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
              Adicionar aos meus pacientes
            </button>
          } @else {
            <button app-button class="w-full" (click)="doLink()" [disabled]="busy()">
              <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
              Adicionar aos meus pacientes
            </button>
            @if (otherDoctors().length > 0) {
              <button app-button variant="outline" class="w-full" (click)="doTransfer()" [disabled]="busy()">
                <app-icon name="stethoscope" class="mr-2 h-4 w-4" />
                Assumir acompanhamento
              </button>
            }
          }
          <button app-button variant="ghost" class="w-full" (click)="viewOnly.emit(patientId())" [disabled]="busy()">
            <app-icon name="briefcaseMedical" class="mr-2 h-4 w-4" />
            Apenas visualizar a ficha
          </button>
          <button app-button variant="ghost" class="w-full" (click)="close.emit()" [disabled]="busy()">
            Cancelar
          </button>
          <p class="mt-2 text-xs text-muted-foreground">
            Assumir remove o vínculo de {{ otherDoctorNames() }} e registra a troca na trilha de auditoria.
            As receitas já emitidas por eles continuam com a autoria original.
          </p>
        </app-card-content>
      </app-card>
    </app-dialog>
  `,
})
export class PatientLinkDialogComponent {
  private readonly panel = inject(DoctorPanelService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly open = input(false);
  readonly patientId = input.required<string>();
  readonly patientName = input('');
  readonly linkedToMe = input(false);
  readonly doctors = input<PanelDoctor[]>([]);
  readonly busy = input(false);

  readonly applied = output<LinkState>();
  readonly viewOnly = output<string>();
  readonly close = output<void>();

  readonly otherDoctors = computed(() => this.doctors().filter((d) => d.id !== this.auth.user()?.id));
  readonly otherDoctorNames = computed(() => this.otherDoctors().map((d) => capitalizeName(d.fullName)).join(', '));

  async doLink(): Promise<void> {
    await this.run(() => this.panel.link(this.patientId()));
  }

  async doTransfer(): Promise<void> {
    await this.run(() => this.panel.transfer(this.patientId()));
  }

  private async run(call: () => Promise<LinkState>): Promise<void> {
    try {
      this.applied.emit(await call());
    } catch {
      this.toast.error('Erro', 'Não foi possível alterar o vínculo do paciente.');
    }
  }
}
