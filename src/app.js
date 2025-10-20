import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { ApiResponse } from './utils/ApiResponse.js';
import { DEBUG, NODE_ENV } from './config/index.js';

// route imports
import testRoutes from './route/test.route.js';
import twilioRoutes from './route/twilio.route.js';

const app = express();

// Security
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));

// CORS Configuration - Updated for Postman compatibility
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (Postman, curl, mobile apps)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            "https://vireact.io",
            "https://www.vireact.io",
            "http://localhost:5173",
            "http://192.168.1.112:5173"
        ];
        
        // Allow all Twilio webhook domains and testing tools
        const isTwilioWebhook = origin && (
            origin.includes('twilio.com') ||
            origin.includes('twilio.io') ||
            origin.includes('ngrok.io') ||
            origin.includes('ngrok-free.app') ||
            origin.includes('webhook.site') ||
            origin.includes('requestbin.com') ||
            origin.includes('postman.com') ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1')
        );
        
        if (allowedOrigins.includes(origin) || isTwilioWebhook) {
            return callback(null, true);
        }
        
        // For development, allow all origins
        if (NODE_ENV === 'development' || DEBUG === 'true') {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'X-Twilio-Signature',
        'X-Twilio-Webhook-Event',
        'Accept',
        'Origin',
        'User-Agent',
        'Cache-Control'
    ],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400
}));


// Rate limiting (optional in dev)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.'
});
// app.use(limiter);

// Logging & parsers
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Health check
app.get('/health', (req, res) => {
    res.status(200).json(
        ApiResponse.success(200, 'Health check successful', null)
    );
});


// Routes
app.use('/api/v1/test', testRoutes);

// Initialize Twilio routes
app.use('/api', twilioRoutes);



export default app;
