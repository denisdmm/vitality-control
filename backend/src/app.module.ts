import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VitalsModule } from './vitals/vitals.module';
import { HealthRecordsModule } from './health-records/health-records.module';
import { MedicationsModule } from './medications/medications.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { ExamTypesModule } from './exam-types/exam-types.module';
import { SharedDataModule } from './shared-data/shared-data.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    VitalsModule,
    HealthRecordsModule,
    MedicationsModule,
    VaccinesModule,
    ExamTypesModule,
    SharedDataModule,
    ReportsModule,
  ],
})
export class AppModule {}