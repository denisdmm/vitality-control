import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PrescriptionsService } from '../../core/prescriptions.service';
import { formatDuration } from '../../models/prescription';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { ButtonComponent } from '../ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../ui/card';
import { IconComponent } from '../icon.component';
import { SpinnerComponent } from '../ui/spinner';
import { TABLE_IMPORTS } from '../ui/table';

@Component({
  selector: 'app-active-medications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent,
    CardContentComponent, ButtonComponent, IconComponent, SpinnerComponent, TABLE_IMPORTS, RouterLink,
  ],
  template: `
    <app-card class="flex h-full flex-col">
      <app-card-header class="flex flex-col items-start gap-4">
        <div class="flex w-full flex-row items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <app-icon name="pill" class="h-6 w-6 text-primary" />
            <div>
              <app-card-title>Medicamentos em uso</app-card-title>
              <app-card-description class="hidden sm:block">Receitas ativas marcadas como uso contínuo</app-card-description>
            </div>
          </div>
          @if (isPatient()) {
            <a app-button size="sm" variant="outline" routerLink="/receituario">
              <app-icon name="fileText" class="mr-2 h-4 w-4" />
              Receituário
            </a>
          }
        </div>
      </app-card-header>
      <app-card-content class="flex-1 overflow-y-auto">
        @if (loading()) {
          <app-spinner label="Carregando medicamentos..." />
        } @else if (active().length > 0) {
          @if (hasSchedulesMissing()) {
            <div class="mb-4 flex items-start gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              <app-icon name="clock" class="mt-0.5 h-4 w-4 shrink-0" />
              <span>Alguns medicamentos ainda não têm horário definido. Ajuste no receituário.</span>
            </div>
          }
          <table app-table>
            <thead app-table-header>
              <tr app-table-row>
                <th app-table-head>Nome</th>
                <th app-table-head class="hidden sm:table-cell">Dosagem</th>
                <th app-table-head class="hidden md:table-cell">Frequência</th>
                <th app-table-head class="hidden lg:table-cell">Duração</th>
                <th app-table-head>Horários</th>
              </tr>
            </thead>
            <tbody app-table-body>
              @for (med of active(); track med.id) {
                <tr app-table-row>
                  <td app-table-cell class="font-medium">{{ med.name }}</td>
                  <td app-table-cell class="hidden sm:table-cell">{{ med.dosage }}</td>
                  <td app-table-cell class="hidden md:table-cell">{{ med.frequency }}</td>
                  <td app-table-cell class="hidden lg:table-cell">
                    <span class="text-sm text-muted-foreground">{{ formatDuration(med) }}</span>
                  </td>
                  <td app-table-cell>
                    @if (med.schedules.length > 0) {
                      <span class="font-mono text-sm">{{ times(med) }}</span>
                    } @else {
                      <span class="text-sm text-muted-foreground">Sem horário definido</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="flex h-full flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <app-icon name="pill" class="mb-4 h-12 w-12" />
            <p class="font-medium">Nenhum medicamento em uso</p>
            <p class="text-sm">Registre uma receita no receituário para acompanhar seus horários.</p>
          </div>
        }
      </app-card-content>
    </app-card>
  `,
})
export class ActiveMedicationsComponent {
  private readonly service = inject(PrescriptionsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly active = this.service.activeMedications;
  readonly loading = this.service.loading;
  readonly isPatient = computed(() => this.auth.user()?.role !== 'MEDICO');
  readonly formatDuration = formatDuration;
  readonly hasSchedulesMissing = computed(() => this.active().some((m) => m.schedules.length === 0));

  constructor() {
    void this.load();
  }

  times(med: { schedules: { time: string }[] }): string {
    return med.schedules.map((s) => s.time).join(' · ');
  }

  private async load(): Promise<void> {
    try {
      await this.service.reload();
    } catch {
      this.toast.error('Erro', 'Não foi possível carregar os medicamentos ativos.');
    }
  }
}
