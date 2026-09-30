import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VitalsModule } from './vitals/vitals.module';
import { HealthRecordsModule } from './health-records/health-records.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { ExamTypesModule } from './exam-types/exam-types.module';
import { SharedDataModule } from './shared-data/shared-data.module';
import { ReportsModule } from './reports/reports.module';
import { DoctorPanelModule } from './doctor-panel/doctor-panel.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    VitalsModule,
    HealthRecordsModule,
    PrescriptionsModule,
    VaccinesModule,
    ExamTypesModule,
    SharedDataModule,
    ReportsModule,
    DoctorPanelModule,
  ],
})
export class AppModule {}