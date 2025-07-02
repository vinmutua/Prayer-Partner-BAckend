const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:3000', // For local frontend development
  'https://prayer-partner-frontend.vercel.app', // Correct Vercel URL
  'http://localhost:5173', // For local frontend development (Vite)
  'http://localhost:8081',  // For local frontend development (alternative)
  'https://modern-clowns-show.loca.lt', // Your localtunnel URL
'https://llp-possibility-marijuana-pen.trycloudflare.com'
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
