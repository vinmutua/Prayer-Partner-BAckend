import { PrismaClient } from '@prisma/client';

let effectiveDbUrl = process.env.DATABASE_URL;

if (effectiveDbUrl && !effectiveDbUrl.includes('connection_limit') && !effectiveDbUrl.includes('pool_timeout')) {
  const separator = effectiveDbUrl.includes('?') ? '&' : '?';
  effectiveDbUrl += `${separator}connection_limit=10&pool_timeout=10`;
}

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal',
  datasources: {
    db: {
      url: effectiveDbUrl, // Use the URL that includes pooling parameters
    },
  },
});

// No longer need to modify process.env.DATABASE_URL here

export default prisma;
