import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment variables from .env for local development
dotenv.config();

export default defineConfig({
  schema: './src/models/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  verbose: true,
  strict: true,
  dbCredentials: {
    host: process.env.AZURE_MYSQL_HOST || 'localhost',
    user: process.env.AZURE_MYSQL_USER || 'root',
    password: process.env.AZURE_MYSQL_PASSWORD || '',
    database: process.env.AZURE_MYSQL_DATABASE || 'poll',
    port: parseInt(process.env.AZURE_MYSQL_PORT || '3306'),
  },
});
