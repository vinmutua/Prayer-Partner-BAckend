import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal',
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Configure connection pooling through URL parameters
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL += `?connection_limit=10&pool_timeout=10`;
}

export default prisma;
