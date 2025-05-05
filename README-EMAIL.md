# Email Integration with Brevo API

This application uses Brevo (formerly Sendinblue) for sending emails via their API. This document explains how to set up and configure the email functionality.

## Setup Instructions

### 1. Create a Brevo Account

1. Go to [Brevo's website](https://www.brevo.com/) and sign up for an account
2. Verify your account through the confirmation email

### 2. Generate an API Key

1. Log in to your Brevo dashboard
2. Navigate to **Settings** > **SMTP & API**
3. In the **API Keys** section, click **Generate a new API key**
4. Give your API key a name (e.g., "Prayer Partners App")
5. Copy the generated API key

### 3. Configure Your Application

1. Open your `.env` file in the backend directory
2. Add or update the following variables:
   ```
   BREVO_API_KEY=your_api_key_here
   DEFAULT_FROM_EMAIL=your_sender_email@example.com
   ```
3. Make sure the sender email is verified in your Brevo account or use a domain that you've set up with Brevo

### 4. Test the Email Integration

Run the test scripts to verify your email integration is working correctly:

```bash
# Test basic email functionality
node test-email.js

# Test welcome email functionality (via registration)
node test-welcome-email.js

# Test welcome email directly (without registration)
node test-welcome-email-direct.js

# Test prayer partner notification email
node test-partner-notification.js

# Test prayer request reminder email
node test-reminder-email.js
```

## Email Features

The application uses Brevo for the following email functionality:

1. **Welcome Emails**: Sent to new users when they register
2. **Prayer Partner Notifications**: Sent when users are paired with a prayer partner
3. **Reminder Emails**: Sent to remind users to submit prayer requests

## Troubleshooting

If you encounter issues with email sending:

1. **Check API Key**: Verify your API key is correct and active in the Brevo dashboard
2. **Check Sender Email**: Make sure your sender email is verified or using a verified domain
3. **Check Logs**: Review the application logs for specific error messages
4. **Check Brevo Limits**: Ensure you haven't exceeded your Brevo plan's sending limits
5. **Check Brevo Dashboard**: Look for any account restrictions or issues in your Brevo dashboard
6. **Check Spam Folders**: Email providers may mark messages as spam, especially from new senders

For detailed troubleshooting steps, see the [Email Troubleshooting Guide](./EMAIL-TROUBLESHOOTING.md).

## Implementation Details

The email service is implemented in `src/services/email.service.ts` and uses Brevo's direct REST API for sending emails. The service provides the following functions:

- `sendWelcomeEmail`: Sends a welcome email to new users
- `sendPrayerPartnerNotification`: Notifies users of their prayer partner assignments
- `sendReminderEmails`: Sends reminders to users to submit prayer requests

## Rate Limits

Be aware that Brevo has rate limits on their free plan:
- 300 emails per day
- Maximum of 100 emails per hour

If you need to send more emails, consider upgrading to a paid plan.

## Additional Resources

- [Brevo API Documentation](https://developers.brevo.com/docs)
- [Brevo Transactional Email API](https://developers.brevo.com/reference/sendtransacemail)
