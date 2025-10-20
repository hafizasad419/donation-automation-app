import app from './app.js';
import { PORT, NODE_ENV, validateEnvironment } from './config/index.js';

const startServer = async () => {
  try {
    // Validate environment variables before starting server
    console.log('🔍 Validating environment variables...');
    validateEnvironment();
    console.log('✅ Environment validation passed');
    
    app.listen(PORT, () => {
      console.log(`🚀 Donation Automation App server running on port ${PORT}`);
      console.log(`📝 Environment: ${NODE_ENV}`);
      console.log('📱 SMS Donation Flow ready to receive messages');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error('💡 Make sure you have a .env file with all required variables');
    console.error('📋 Copy .env-sample to .env and fill in your credentials');
    process.exit(1);
  }
}

startServer();
