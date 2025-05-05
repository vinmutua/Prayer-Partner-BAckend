# Email Delivery Troubleshooting Guide

If you're experiencing issues with email delivery in the Prayer Partners application, this guide will help you diagnose and resolve common problems.

## Common Email Delivery Issues

### 1. Emails Not Being Received

If emails are being sent successfully (according to the API response) but not being received, check the following:

#### Check Spam/Junk Folders
- Most email providers may initially mark emails from new senders as spam
- Look in your spam/junk folder for the emails
- Mark the emails as "Not Spam" to train your email provider

#### Verify Sender Domain
- Make sure the sender email domain has proper SPF, DKIM, and DMARC records
- In Brevo, go to Settings > Senders & IP > Domains to verify your domain
- If using a personal email as the sender, make sure it's verified in Brevo

#### Check Email Content
- Avoid spam trigger words in subject lines and content
- Ensure HTML is properly formatted
- Avoid excessive use of images or links

### 2. API Errors

If you're getting errors when trying to send emails:

#### Check API Key
- Verify that your Brevo API key is correct and active
- Make sure the API key has permission to send transactional emails
- Check if you've reached your API rate limits

#### Check Request Format
- Ensure your email request format matches Brevo's API requirements
- Validate that all required fields are included
- Check for any formatting issues in the HTML content

### 3. Specific Email Types Not Being Delivered

If only certain types of emails are not being delivered:

#### Welcome Emails
- These may be filtered more aggressively by email providers
- Consider simplifying the content
- Avoid including too many links in welcome emails

#### Notification Emails
- Make sure the subject line clearly indicates the purpose
- Personalize the content to reduce spam filtering
- Consider adding the recipient's name in the subject line

## Testing Email Delivery

Use the provided test scripts to diagnose issues:

```bash
# Test basic email functionality
node test-email.js

# Test welcome email directly
node test-welcome-email-direct.js

# Test prayer partner notification email
node test-partner-notification.js

# Test prayer request reminder email
node test-reminder-email.js
```

## Checking Brevo Dashboard

The Brevo dashboard provides valuable information about email delivery:

1. Log in to your Brevo account
2. Go to "Campaigns" > "Statistics" to see delivery rates
3. Check "Transactional" > "Logs" to see the status of individual emails
4. Look for any blocked or bounced emails and their reasons

## Improving Deliverability

### 1. Use a Custom Domain

Using a custom domain with proper DNS setup significantly improves deliverability:

1. Add your domain in Brevo (Settings > Senders & IP > Domains)
2. Follow the instructions to set up SPF, DKIM, and DMARC records
3. Verify the domain

### 2. Warm Up Your Sender Reputation

If you're sending to a large number of recipients:

1. Start with a small volume of emails
2. Gradually increase the volume over time
3. Ensure high engagement rates (opens, clicks)
4. Avoid sending to invalid or inactive email addresses

### 3. Optimize Email Content

1. Use a clear and relevant subject line
2. Include personalization (recipient's name)
3. Keep a good text-to-image ratio
4. Avoid spam trigger words and excessive punctuation
5. Include a clear unsubscribe option

## Getting Help from Brevo

If you've tried everything and still have issues:

1. Contact Brevo support with specific message IDs
2. Provide them with the recipient email addresses having issues
3. Ask for a deliverability review of your account

## Monitoring Email Delivery

Consider implementing email delivery monitoring:

1. Add logging for all email sending attempts
2. Track delivery rates and bounce rates
3. Set up alerts for unusual patterns
4. Regularly review email sending statistics
