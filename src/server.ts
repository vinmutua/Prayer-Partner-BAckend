import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/error.middleware';
import logger, { requestLogger, errorLogger } from './utils/logger.util';
import fs from 'fs';
import path from 'path';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import pairingRoutes from './routes/pairing.routes';
import themeRoutes from './routes/theme.routes';
import prayerRequestRoutes from './routes/prayer-request.routes';

// Import services
import { schedulePairingGeneration } from './services/scheduler.service';

// Load environment variables
dotenv.config({ override: true });

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 8080;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  logger.info('Created logs directory');
}
logger.info(`✅ Allowed Origins: ${JSON.stringify(allowedOrigins)}`);

// Initialize Prisma client
export const prisma = new PrismaClient();

// Security middleware
app.use(helmet());

// Updated CORS configuration
const getProductionAllowedOrigins = (): string[] => {
  const urls = process.env.FRONTEND_PRODUCTION_URLS; // Expects comma-separated URLs
  if (!urls) {
    return [];
  }
  return urls.split(',').map(url => url.trim()).filter(url => url.length > 0);
};

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? getProductionAllowedOrigins()
  : ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:8080', 'http://localhost:5173']; // Development origins

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  logger.warn('FRONTEND_PRODUCTION_URLS is not set or is empty. CORS might block frontend requests in production.');
}

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = allowedOrigins.includes(origin || '');

      logger.info(`🌐 CORS Request from origin: ${origin ?? '[no origin]'}`);

      if (!origin) {
        // Allow server-to-server, curl, Postman, or SSR requests
        logger.info('✅ No Origin - Allowing request (likely server-side or local dev)');
        return callback(null, true);
      }

      if (!allowed) {
        logger.warn(`❌ Origin '${origin}' is NOT in allowed list: ${JSON.stringify(allowedOrigins)}`);
        return callback(
          new Error(
            `CORS Error: Origin '${origin}' not allowed. Allowed origins: ${allowedOrigins.join(', ')}`
          ),
          false
        );
      }

      logger.info(`✅ Origin '${origin}' is allowed by CORS`);
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all routes
app.use(limiter);

// Rate limits for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20 // limit each IP to 20 login attempts per 15 minutes
});

// Apply request logger middleware
app.use(requestLogger);

app.use(express.json());

// Basic route
app.get('/', (_req: Request, res: Response) => {
  res.send('Prayer Partners API is running');
});

// Health check endpoint for Render
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Register routes
app.use('/auth', authLimiter, authRoutes);
app.use('/users', userRoutes);
app.use('/pairings', pairingRoutes);
app.use('/themes', themeRoutes);
app.use('/prayer-requests', prayerRequestRoutes);

// Schedule weekly pairing generation in production
if (process.env.NODE_ENV === 'production') {
  schedulePairingGeneration();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Global error logger and handler
app.use(errorLogger);
app.use(errorHandler);

// Start server
prisma.$connect()
  .then(() => {
    logger.info('Database connection established');
    app.listen(port, '0.0.0.0', () => {
  logger.info(`✅ Server is running at http://0.0.0.0:${port}`);
});
  })
  .catch((error: Error) => { // Added Error type
    logger.error('Database connection failed', { error: error.message, stack: error.stack });
    process.exit(1);
  });
