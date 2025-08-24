import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:3001',
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });


  console.log({ PORT: process.env.PORT })
  const PORT = process.env.PORT || 7000;
  await app.listen(PORT);
  console.log(`API: http://localhost:${PORT}/graphql`);

}
bootstrap();
