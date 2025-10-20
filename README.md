# SMS Donation Automation App

An automated SMS-based donation collection system that guides users through a structured donation flow via text messaging.

## Features

- **Automated SMS Flow**: 6-step donation collection process
- **State Management**: Redis-based session storage with Upstash
- **Timeout Handling**: QStash-scheduled inactivity checks
- **Data Storage**: Google Sheets integration for donation records
- **Message Logging**: Complete audit trail of all SMS interactions
- **Flexible Commands**: Support for editing, canceling, and restarting

## Architecture

```
[User SMS] --> Twilio --> /api/twilio (Vercel serverless)
                      |
                      v
                 Controller (high-level)
                      |
     +----------------+----------------+
     |                                 |
 Step services (step1..step6)   Utility services (edit, cancel, summary)
     |                                 |
    Redis (Upstash)  <--- session state, jobId, lastMessageAt
     |
 QStash (Upstash) -- schedule inactivity check jobs
     |
 Google Sheets API <-- append final confirmed row
     |
 Twilio messages.create() --> send replies/confirmations
```

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number
- `UPSTASH_REDIS_REST_URL`: Your Upstash Redis URL
- `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis token
- `QSTASH_TOKEN`: Your Upstash QStash token
- `SHEET_ID`: Your Google Sheets ID
- `GOOGLE_SERVICE_EMAIL`: Google service account email
- `GOOGLE_PRIVATE_KEY`: Google service account private key
- `APP_BASE_URL`: Your deployed app URL

### 2. Install Dependencies

```bash
npm install
```

### 3. Development

```bash
npm run dev
```

### 4. Deployment

Deploy to Vercel:

```bash
npx vercel --prod
```

### 5. Twilio Configuration

1. Set your Twilio webhook URL to: `https://your-app.vercel.app/api/twilio`
2. Configure your phone number or messaging service
3. Test with Twilio sandbox credentials first

## Donation Flow

1. **Congregation**: User provides organization name
2. **Person Name**: User provides full name
3. **Phone Number**: User provides 10-digit phone number
4. **Tax ID**: User provides 9-digit tax ID
5. **Amount**: User provides donation amount
6. **Confirmation**: User confirms all details

## Commands

- `start over`: Restart the entire flow
- `cancel`: Cancel and clear session
- `change [field]`: Edit a specific field
- `help`: Show help message
- `finish`: Continue with current step

## API Endpoints

- `POST /api/twilio`: Twilio webhook endpoint
- `POST /api/check-inactivity`: QStash timeout check endpoint
- `GET /health`: Health check endpoint

## Testing

Test the webhook locally using ngrok:

```bash
npx ngrok http 3000
```

Then update your Twilio webhook URL to the ngrok URL.

## Project Structure

```
src/
├── constants.js              # App constants and messages
├── controller/
│   └── smsController.js     # Main SMS flow controller
├── lib/
│   ├── redis.js             # Redis connection and helpers
│   ├── twilio.js            # Twilio SMS functions
│   ├── qstash.js            # QStash scheduling functions
│   ├── sheets.js            # Google Sheets integration
│   └── logger.js            # Debug logging utilities
├── service/
│   ├── step01_congregation.js
│   ├── step02_personName.js
│   ├── step03_phoneNumber.js
│   ├── step04_taxId.js
│   ├── step05_amount.js
│   ├── step06_confirmation.js
│   ├── editService.js
│   ├── cancelService.js
│   └── utilsService.js
├── validator/
│   ├── step01.zod.js
│   ├── step02.zod.js
│   ├── step03.zod.js
│   ├── step04.zod.js
│   └── step05.zod.js
└── route/
    └── twilio.route.js      # API routes
```

## Error Handling

- Comprehensive error logging
- Graceful fallbacks for external service failures
- User-friendly error messages
- Automatic retry mechanisms for critical operations

## Security

- Twilio webhook signature validation (optional)
- Environment variable protection
- Input validation with Zod schemas
- Rate limiting and CORS protection
