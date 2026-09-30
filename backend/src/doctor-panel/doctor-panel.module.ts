import { Module } from '@nestjs/common';
import { DoctorAuditController, DoctorPanelController } from './doctor-panel.controller';
import { DoctorPanelService } from './doctor-panel.service';

@Module({
  controllers: [DoctorPanelController, DoctorAuditController],
  providers: [DoctorPanelService],
})
export class DoctorPanelModule {}
