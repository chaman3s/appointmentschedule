import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
config: ConfigService,
): TypeOrmModuleOptions => ({
type: 'postgres',
host: config.get<string>('DB_HOST'),
port: parseInt(config.get<string>('DB_PORT')!),
username: config.get<string>('DB_USER'),
password: config.get<string>('DB_PASS'),
database: config.get<string>('DB_NAME'),
autoLoadEntities: true,
synchronize: true,
});
