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
dotenv.config();

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 3000;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  logger.info('Created logs directory');
}

// Initialize Prisma client
export const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

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

// Register routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pairings', pairingRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/prayer-requests', prayerRequestRoutes);

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
    app.listen(port, () => {
      logger.info(`Server is running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    logger.error('Database connection failed', { error: error.message, stack: error.stack });
    process.exit(1);
  });
