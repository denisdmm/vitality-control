import { Module } from '@nestjs/common';
import { ExamTypesController } from './exam-types.controller';

@Module({ controllers: [ExamTypesController] })
export class ExamTypesModule {}