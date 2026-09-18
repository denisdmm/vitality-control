import { Module } from '@nestjs/common';
import { VaccinesController } from './vaccines.controller';

@Module({ controllers: [VaccinesController] })
export class VaccinesModule {}