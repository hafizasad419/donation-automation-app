# Deployment Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in all required credentials

3. **Test Connections**
   ```bash
   npm run test:connections
   ```

4. **Deploy to Vercel**
   ```bash
   npx vercel --prod
   ```

## Environment Variables Setup

### Twilio Setup
1. Get credentials from [Twilio Console](https://console.twilio.com/)
2. Set up a phone number or messaging service
3. Configure webhook URL: `https://your-app.vercel.app/api/twilio`

### Upstash Setup
1. Create Redis database at [Upstash](https://upstash.com/)
2. Get REST URL and token
3. Create QStash project and get token

### Google Sheets Setup
1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create a service account
4. Download JSON key file
5. Share your Google Sheet with the service account email
6. Set up two sheets: "Sheet1" for donations, "Messages" for logging

## Testing

### Local Testing
```bash
npm run dev
```

Use ngrok to expose local server:
```bash
npx ngrok http 3000
```

### Webhook Testing
Test with curl:
```bash
curl -X POST http://localhost:3000/api/twilio \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B15551234567&Body=Hi"
```

### Production Testing
1. Send SMS to your Twilio number
2. Check Vercel function logs
3. Verify Redis session storage
4. Check Google Sheets for records

## Monitoring

- **Vercel Dashboard**: Monitor function performance
- **Twilio Console**: Check message delivery
- **Upstash Dashboard**: Monitor Redis usage
- **Google Sheets**: View donation records and message logs

## Troubleshooting

### Common Issues

1. **SMS not sending**
   - Check Twilio credentials
   - Verify webhook URL is correct
   - Check Vercel function logs

2. **Redis connection failed**
   - Verify Upstash credentials
   - Check network connectivity
   - Ensure Redis database is active

3. **Google Sheets not updating**
   - Check service account permissions
   - Verify sheet is shared with service account
   - Check Google Sheets API quota

4. **QStash timeout not working**
   - Verify QStash token
   - Check inactivity endpoint URL
   - Monitor QStash dashboard

### Debug Mode
Set `DEBUG=true` in environment variables for detailed logging.

## Security Checklist

- [ ] All environment variables are set
- [ ] Twilio webhook signature validation enabled (optional)
- [ ] Google service account has minimal permissions
- [ ] Redis database has proper access controls
- [ ] QStash token is secure
- [ ] HTTPS enabled for all endpoints
