import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BloodPressureLogComponent } from '../../shared/widgets/blood-pressure-log';
import { GlucoseLogComponent } from '../../shared/widgets/glucose-log';
import { WeightLogComponent } from '../../shared/widgets/weight-log';
import { MedicationTrackerComponent } from '../../shared/widgets/medication-tracker';
import { VaccinationWalletComponent } from '../../shared/widgets/vaccination-wallet';
import { PublicCampaignsComponent } from '../../shared/widgets/public-campaigns';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BloodPressureLogComponent,
    GlucoseLogComponent,
    WeightLogComponent,
    MedicationTrackerComponent,
    VaccinationWalletComponent,
    PublicCampaignsComponent,
  ],
  template: `
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div class="lg:col-span-2 xl:col-span-2">
        <app-blood-pressure-log />
      </div>
      <div class="lg:col-span-2 xl:col-span-2">
        <app-glucose-log />
      </div>
      <div class="lg:col-span-2 xl:col-span-2">
        <app-weight-log />
      </div>
      <div class="lg:col-span-2 xl:col-span-2">
        <app-medication-tracker />
      </div>
      <div class="lg:col-span-4 xl:col-span-4">
        <app-vaccination-wallet />
      </div>
      <div class="lg:col-span-4 xl:col-span-4">
        <app-public-campaigns />
      </div>
    </div>
  `,
})
export class DashboardComponent {}