import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  console.log({PORT: process.env.PORT})
  const PORT = process.env.PORT || 7000;
  await app.listen(PORT);
  console.log(`API: http://localhost:${PORT}/api`);

}
bootstrap();
