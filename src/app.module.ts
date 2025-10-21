import { Module } from '@nestjs/common';
import generateModulesSet from './common/utils/modules-set';

@Module({
  imports: generateModulesSet(),
})
export class AppModule {}
