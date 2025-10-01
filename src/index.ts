import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import morgan from 'morgan';

// Import routes
import authRoutes from './routes/auth';
import subjectsRoutes from './routes/subjects';
import subscriptionRoutes from './routes/subscription';

dotenv.config();

// Initialize Firebase Admin SDK with error handling
let db: admin.firestore.Firestore | null = null;

try {
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID || 'test-project-aba20',
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
    client_id: process.env.FIREBASE_CLIENT_ID || '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || '',
  };

  if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && !process.env.FIREBASE_PRIVATE_KEY?.includes('DUMMY')) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    
    // Initialize Firestore
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Firebase Admin SDK and Firestore initialized successfully');
  } else {
    console.log('⚠️  Firebase Admin SDK and Firestore not initialized - using development mode');
    console.log('   To enable Firebase features, set proper Firebase credentials in .env file');
  }
} catch (error) {
  console.log('⚠️  Firebase initialization failed:', error);
  console.log('   Running in development mode without Firebase');
}

// Export Firestore instance for use in routes
export { db };

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));  

// HTTP request logging with Morgan
app.use(morgan('combined'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Brainac API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      subjects: '/api/subjects',
      subscription: '/api/subscription'
    }
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Brainac API v1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile'
      },
      subjects: {
        getSubjects: 'GET /api/subjects/subjects',
        getVideos: 'GET /api/subjects/videos/:subjectId?',
        getVideo: 'GET /api/subjects/video/:videoId'
      },
      subscription: {
        getPlans: 'GET /api/subscription/plans',
        createOrder: 'POST /api/subscription/create-order',
        verifyPayment: 'POST /api/subscription/verify-payment',
        getStatus: 'GET /api/subscription/status',
        cancel: 'POST /api/subscription/cancel'
      }
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    availableRoutes: [
      '/api/auth/*',
      '/api/subjects/*',
      '/api/subscription/*',
      '/health',
      '/api'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Brainac API server is running on port ${PORT}`);
  // console.log(`📱 Health check: http://localhost:${PORT}/health`);
  // console.log(`📚 API docs: http://localhost:${PORT}/api`);
  // console.log(`� Auth routes: http://localhost:${PORT}/api/auth`);
  // console.log(`� Subjects routes: http://localhost:${PORT}/api/subjects`);
  // console.log(`💳 Subscription routes: http://localhost:${PORT}/api/subscription`);
});

export default app;