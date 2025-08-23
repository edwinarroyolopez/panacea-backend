import { Module, Global } from '@nestjs/common';
import { LlmService } from './llm.service';

@Global() // opcional, pero práctico: lo deja disponible en toda la app
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}