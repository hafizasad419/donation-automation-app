import serverless from 'serverless-http';
import app from './app.js';

// Create the serverless handler
const serverlessHandler = serverless(app);

const handler = async (event, context) => {
  try {
    return await serverlessHandler(event, context);
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};

export const handlerLambda = handler; // named export for AWS
export default handler; // default for frameworks like Vercel
