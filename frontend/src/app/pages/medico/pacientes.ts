import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DoctorPanelService } from '../../core/doctor-panel.service';
import { ToastService } from '../../core/toast.service';
import { capitalizeName, fmtIso } from '../../core/dates';
import type { LinkState, PanelPatient, PatientScope } from '../../models/doctor-panel';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { InputComponent } from '../../shared/ui/input';
import { TABLE_IMPORTS } from '../../shared/ui/table';
import { SpinnerComponent } from '../../shared/ui/spinner';
import { IconComponent } from '../../shared/icon.component';
import { PatientLinkDialogComponent } from '../../shared/widgets/patient-link-dialog';

@Component({
  selector: 'app-medico-pacientes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    InputComponent,
    SpinnerComponent,
    TABLE_IMPORTS,
    IconComponent,
    RouterLink,
    PatientLinkDialogComponent,
  ],
  template: `
    <div class="flex flex-1 flex-col gap-6">
      <app-card>
        <app-card-header class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <app-card-title>Meus Pacientes</app-card-title>
            <app-card-description>
              {{ isAdmin() ? 'Todos os pacientes do sistema.' : 'Pacientes vinculados a você.' }}
            </app-card-description>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <div class="relative">
              <input
                app-input
                class="w-full sm:w-72"
                placeholder="Buscar por nome ou prontuário"
                [value]="search()"
                (input)="onSearch(inputValue($event))" />
            </div>
            <button app-button variant="outline" (click)="togglePending()" [disabled]="loading()">
              <app-icon name="triangleAlert" class="mr-2 h-4 w-4" />
              {{ pendingOnly() ? 'Mostrando pendentes' : 'Só com pendência' }}
            </button>
            <button app-button (click)="openInclude()" [disabled]="loading()">
              <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
              Incluir paciente
            </button>
          </div>
        </app-card-header>

        <app-card-content>
          @if (loading()) {
            <div class="flex h-40 items-center justify-center"><app-spinner /></div>
          } @else if (items().length === 0) {
            <div class="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
              <app-icon name="users" class="mb-4 h-12 w-12" />
              @if (search()) {
                <p class="font-medium">Nenhum paciente encontrado para "{{ search() }}".</p>
                <p class="text-sm">Confira o nome ou use o número de prontuário.</p>
              } @else {
                <p class="font-medium">Nenhum paciente na sua lista.</p>
                <p class="text-sm">Use "Incluir paciente" para vincular o primeiro.</p>
              }
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table app-table>
                <thead app-table-header>
                  <tr app-table-row>
                    <th app-table-head>Paciente</th>
                    <th app-table-head>Última consulta</th>
                    <th app-table-head>Médicos</th>
                    <th app-table-head>Pendências</th>
                    <th app-table-head class="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody app-table-body>
                  @for (p of items(); track p.id) {
                    <tr app-table-row>
                      <td app-table-cell>
                        <div class="font-medium">{{ p.fullName }}</div>
                        <div class="text-xs text-muted-foreground">
                          {{ p.medicalRecordNumber ?? 'Sem nº de prontuário' }}
                        </div>
                      </td>
                      <td app-table-cell>
                        @if (p.lastPrescriptionAt) {
                          {{ fmtIso(p.lastPrescriptionAt) }}
                        } @else {
                          <span class="text-muted-foreground">Sem consulta</span>
                        }
                      </td>
                      <td app-table-cell>
                        <div class="flex flex-wrap gap-1">
                          @if (p.linkedToMe) {
                            <span app-badge variant="default">Você</span>
                          }
                          @for (d of otherDoctorsOf(p); track d.id) {
                            <span app-badge variant="secondary">{{ d.fullName }}</span>
                          }
                          @if (p.linkedToMe && p.doctors.length === 1) {
                            <span class="text-xs text-muted-foreground">sem outros médicos</span>
                          }
                        </div>
                      </td>
                      <td app-table-cell>
                        @if (p.signals.pending) {
                          <div class="flex flex-col gap-1 text-xs text-muted-foreground">
                            @if (p.signals.medicationsWithoutSchedule > 0) {
                              <span>{{ p.signals.medicationsWithoutSchedule }} medicamento(s) sem horário</span>
                            }
                            @if (p.signals.noRecentMeasurement) {
                              <span>sem medição nos últimos 7 dias</span>
                            }
                            @if (p.signals.examOverdue) {
                              <span>sem exame nos últimos 90 dias</span>
                            }
                          </div>
                        } @else {
                          <span app-badge variant="secondary">Em dia</span>
                        }
                      </td>
                      <td app-table-cell class="text-right">
                        <div class="flex justify-end gap-2">
                          <a app-button variant="ghost" size="sm" [routerLink]="['/medico/pacientes', p.id, 'ficha']">
                            Ver ficha
                          </a>
                          @if (!p.linkedToMe) {
                            <button app-button variant="outline" size="sm" (click)="openLink(p)">
                              Vincular
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="mt-4 text-sm text-muted-foreground">{{ total() }} paciente(s)</p>
          }
        </app-card-content>
      </app-card>
    </div>

    <app-patient-link-dialog
      [open]="dialogOpen()"
      [patientId]="dialogPatient()?.id ?? ''"
      [patientName]="dialogPatient()?.fullName ?? ''"
      [linkedToMe]="dialogPatient()?.linkedToMe ?? false"
      [doctors]="dialogPatient()?.doctors ?? []"
      [busy]="dialogBusy()"
      (applied)="onLinkApplied($event)"
      (viewOnly)="onViewOnly($event)"
      (close)="closeDialog()" />
  `,
})
export class MedicoPacientesComponent {
  private readonly panel = inject(DoctorPanelService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly fmtIso = fmtIso;
  readonly search = signal('');
  readonly pendingOnly = signal(false);
  readonly scope = signal<PatientScope>(this.auth.user()?.role === 'ADMINISTRADOR' ? 'all' : 'mine');
  readonly items = signal<PanelPatient[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  readonly dialogOpen = signal(false);
  readonly dialogBusy = signal(false);
  readonly dialogPatient = signal<PanelPatient | null>(null);

  readonly isAdmin = computed(() => this.auth.user()?.role === 'ADMINISTRADOR');


  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.load();
  }

  otherDoctorsOf(p: PanelPatient) {
    const me = this.auth.user()?.id;
    return p.doctors.filter((d) => d.id !== me);
  }

  readonly inputValue = (e: Event) => (e.target as HTMLInputElement).value;

  onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(), 300);
  }

  togglePending(): void {
    this.pendingOnly.update((v) => !v);
    void this.load();
  }

  /** "Incluir paciente" abre a busca já limpa, para vincular o primeiro paciente. */
  openInclude(): void {
    this.search.set('');
    this.pendingOnly.set(false);
    void this.load();
    this.toast.toast({
      title: 'Incluir paciente',
      description: 'Busque pelo nome ou número de prontuário e use "Vincular" no resultado.',
    });
  }

  openLink(p: PanelPatient): void {
    this.dialogPatient.set(p);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  async onLinkApplied(state: LinkState): Promise<void> {
    this.closeDialog();
    await this.load();
    this.toast.success(
      'Vínculo atualizado',
      state.linkedToMe
        ? 'Paciente adicionado à sua lista.'
        : 'O paciente foi adicionado à sua lista.',
    );
  }

  onViewOnly(patientId: string): void {
    this.closeDialog();
    void this.router.navigate(['/medico/pacientes', patientId, 'ficha']);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.panel.listPatients({
        scope: this.scope(),
        search: this.search().trim() || undefined,
        pendingOnly: this.pendingOnly(),
      });
      this.items.set(res.items);
      this.total.set(res.total);
    } catch {
      this.toast.error('Erro', 'Não foi possível carregar os pacientes.');
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
