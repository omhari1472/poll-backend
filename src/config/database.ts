import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import type { SslOptions } from 'mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@/models/schema';

dotenv.config();

let connectionPool: ReturnType<typeof mysql.createPool> | undefined;

async function testConnection(pool: ReturnType<typeof mysql.createPool>, retries = 3, delay = 2000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️  Database connection test attempt ${i + 1}/${retries} failed: ${errorMessage}`);
      if (i < retries - 1) {
        console.log(`🔄 Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

export function createDbConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  const isAzureHost = databaseUrl?.includes('mysql.database.azure.com') || 
                     process.env.AZURE_MYSQL_HOST?.includes('mysql.database.azure.com');
  const sslEnv = process.env.MYSQL_SSL ?? process.env.AZURE_MYSQL_SSL;
  const enableSsl = isAzureHost || (sslEnv ? sslEnv === 'true' : true);
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

  let config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };

  if (isValidDatabaseUrl && databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      const rawDbName = url.pathname.replace(/^\//, '').split('?')[0];
      const dbName: string = (rawDbName?.trim() ?? 'poll') || 'poll';
      
      config = {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: dbName,
      };
      
      console.log(`📊 Using DATABASE_URL connection`);
      console.log(`   Host: ${config.host}:${config.port}`);
      console.log(`   Database: ${config.database}`);
      console.log(`   User: ${config.user}`);
    } catch (error) {
      console.error('❌ Error parsing DATABASE_URL, falling back to discrete env vars:', error);
      config = {
        host: process.env.AZURE_MYSQL_HOST || process.env.MYSQL_HOST || 'localhost',
        user: process.env.AZURE_MYSQL_USER || process.env.MYSQL_USER || '',
        password: process.env.AZURE_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
        database: process.env.AZURE_MYSQL_DATABASE || process.env.MYSQL_DATABASE || '',
        port: parseInt(
          process.env.AZURE_MYSQL_PORT || process.env.MYSQL_PORT || '3306',
          10
        ),
      };
    }
  } else {
    console.warn('⚠️  DATABASE_URL is not set or is a placeholder, using discrete env vars');
    config = {
      host: process.env.AZURE_MYSQL_HOST || process.env.MYSQL_HOST || 'localhost',
      user: process.env.AZURE_MYSQL_USER || process.env.MYSQL_USER || '',
      password: process.env.AZURE_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
      database: process.env.AZURE_MYSQL_DATABASE || process.env.MYSQL_DATABASE || '',
      port: parseInt(
        process.env.AZURE_MYSQL_PORT || process.env.MYSQL_PORT || '3306',
        10
      ),
    };
    
    console.log(`📊 Using discrete env vars`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
  }

  if (!config.host || !config.user || !config.database) {
    console.error('❌ Missing required database configuration!');
    console.error('   Please set DATABASE_URL or individual MySQL environment variables.');
    throw new Error('Database configuration is missing. Please set DATABASE_URL or MySQL environment variables.');
  }

  connectionPool = mysql.createPool({
    ...config,
    ...commonConfig,
  });

  // Test connection asynchronously
  testConnection(connectionPool).then(success => {
    if (success) {
      console.log(`✅ Database connection pool created successfully`);
    } else {
      console.error('❌ Database connection test failed after retries');
      console.error('   Please verify your database credentials and ensure the database is accessible.');
    }
  }).catch(error => {
    console.error('❌ Error testing database connection:', error);
  });

  return drizzle(connectionPool, { schema, mode: 'default' });
}

export const db = createDbConnection();

// Export function to check database health
export async function checkDbHealth(): Promise<boolean> {
  if (!connectionPool) {
    return false;
  }
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

export type DbInstance = ReturnType<typeof createDbConnection>;

export default db;
