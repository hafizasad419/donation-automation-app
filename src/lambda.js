import serverless from 'serverless-http';
import app from './app.js';

const handler = async (event, context) => {
  const expressHandler = serverless(app);
  return expressHandler(event, context);
};

export const handlerLambda = handler; // named export for AWS
export default handler; // default for frameworks like Vercel
