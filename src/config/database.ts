import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/mysql2';
import type { SslOptions } from 'mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@/models/schema';

dotenv.config();

export function createDbConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  const isAzureHost = databaseUrl?.includes('mysql.database.azure.com') || 
                     process.env.AZURE_MYSQL_HOST?.includes('mysql.database.azure.com');
  const sslEnv = process.env.MYSQL_SSL ?? process.env.AZURE_MYSQL_SSL;
  const enableSsl = isAzureHost || (sslEnv ? sslEnv === 'true' : true);
  const rejectUnauthorized = process.env.MYSQL_SSL_REJECT_UNAUTHORIZED === 'true';
  const sslOptions: SslOptions | undefined = enableSsl
    ? { rejectUnauthorized: false }
    : undefined;

  const isValidDatabaseUrl = databaseUrl && 
    databaseUrl !== 'mysql://user:password@host:port/database' &&
    databaseUrl.startsWith('mysql://') &&
    !databaseUrl.includes('user:password@host:port');

  const commonConfig = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ...(sslOptions ? { ssl: sslOptions } : {}),
  };

  let pool: ReturnType<typeof mysql.createPool> | undefined;
  if (isValidDatabaseUrl && databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      const rawDbName = url.pathname.replace(/^\//, '').split('?')[0];
      const dbName: string = (rawDbName?.trim() ?? 'poll') || 'poll';
      
      pool = mysql.createPool({
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: dbName,
        ...commonConfig,
      });
      console.log(`✅ Connected to MySQL database: ${url.hostname}/${dbName}`);
    } catch (error) {
      console.error('❌ Error parsing DATABASE_URL, falling back to discrete env vars:', error);
    }
  } else {
    console.warn('⚠️  DATABASE_URL is not set or is a placeholder, using discrete env vars');
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.AZURE_MYSQL_HOST || process.env.MYSQL_HOST || 'localhost',
      user: process.env.AZURE_MYSQL_USER || process.env.MYSQL_USER || '',
      password: process.env.AZURE_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
      database: process.env.AZURE_MYSQL_DATABASE || process.env.MYSQL_DATABASE || '',
      port: parseInt(
        process.env.AZURE_MYSQL_PORT || process.env.MYSQL_PORT || '3306',
        10
      ),
      ...commonConfig,
    });
  }

  return drizzle(pool, { schema, mode: 'default' });
}

export const db = createDbConnection();

export type DbInstance = ReturnType<typeof createDbConnection>;

export default db;
