const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'https://prayer-partners-app.vercel.app',
  'https://prayer-partners-h2y0e0bhn-musyokis-projects-31dc945d.vercel.app',
  'http://localhost:3000', // Added for local frontend development
  'http://localhost:5173', // Added for local frontend development (Vite)
  'http://localhost:8081'  // Added for local frontend development (alternative)
];

export const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
};
