import { Module } from '@nestjs/common';
import {
  MedicationSchedulesController,
  PatientPrescriptionsController,
  PrescriptionMedicationsController,
  PrescriptionsController,
} from './prescriptions.controller';
import { PrescriptionFileService } from './prescription-file.service';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  controllers: [
    PrescriptionsController,
    PatientPrescriptionsController,
    PrescriptionMedicationsController,
    MedicationSchedulesController,
  ],
  providers: [PrescriptionsService, PrescriptionFileService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
