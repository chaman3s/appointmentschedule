import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => {
  const databaseUrl = config.get<string>('DATABASE_URL');
  const environment = config.get<string>('NODE_ENV'); // ✅ standard

  // ✅ PRODUCTION (Render)
  if (environment === 'production') {
    return {
      type: 'postgres',
      url: databaseUrl,
      autoLoadEntities: true,
      synchronize: true, // ✅ MUST be false
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }

  // ✅ LOCAL DEVELOPMENT
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: parseInt(config.get<string>('DB_PORT') || '5432'),
    username: config.get<string>('DB_USER'),
    password: config.get<string>('DB_PASS'),
    database: config.get<string>('DB_NAME'),
    autoLoadEntities: true,
    synchronize: true, // ✅ OK locally
  };
};