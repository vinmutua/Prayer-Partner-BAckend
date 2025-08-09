import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Email Service using Brevo API
 *
 * This service uses Brevo's direct REST API for sending emails.
 * To use this service:
 * 1. Create a Brevo account at https://www.brevo.com/
 * 2. Generate an API key from your Brevo dashboard
 * 3. Add the API key to your .env file as BREVO_API_KEY
 * 4. Set your DEFAULT_FROM_EMAIL in the .env file
 */

// Check if Brevo API key is configured
if (!process.env.BREVO_API_KEY) {
  console.warn('WARNING: BREVO_API_KEY is not set in environment variables. Email functionality will not work.');
}

// Configure Brevo API client
const brevoApiKey = process.env.BREVO_API_KEY;

// Create axios instance for Brevo API
const brevoClient = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  headers: {
    'api-key': brevoApiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000 // 10 second timeout
});

// Get sender email from environment or use default
const senderEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@prayerpartners.com';

// Define a type guard to check if an error has a 'response' property
function isAxiosError(error: any): error is { response: { status: number; data: any } } {
  return error && error.response && typeof error.response.status === 'number';
}

/**
 * Send prayer partner notification email
 */
export const sendPrayerPartnerNotification = async (
  recipientEmail: string,
  recipientName: string,
  partnerName: string,
  themeTitle: string,
  themeDescription: string,
  startDate: Date,
  endDate: Date,
  isSpecialPairing: boolean = false,
  customMessage?: string
) => {
  try {
    // Format dates
    const formattedStartDate = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedEndDate = endDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Create email content with special message for triangle pairings
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568; text-align: center;">Prayer Partners Assignment</h2>
        <p>Dear ${recipientName},</p>
        ${isSpecialPairing
          ? `<p>We're excited to share your <strong>special prayer assignment</strong> for this month. You have been selected to pray for two partners:</p>`
          : `<p>We're excited to share your prayer partner for this monthly:</p>`
        }
        <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #4a5568; margin-top: 0;">Your Prayer Partner${isSpecialPairing ? 's' : ''}</h3>
          <p style="font-size: 18px; font-weight: bold; color: #2d3748;">${partnerName}</p>
          ${isSpecialPairing
            ? `<p style="color: #4a5568;"><em>Note: You are praying for two partners this month, and they will both be praying for you.</em></p>`
            : ''
          }
          <h3 style="color: #4a5568;">Prayer Focus</h3>
          <p style="font-weight: bold; color: #2d3748;">${themeTitle}</p>
          <p>${themeDescription}</p>
          <h3 style="color: #4a5568;">Duration</h3>
          <p>From: <strong>${formattedStartDate}</strong></p>
          <p>To: <strong>${formattedEndDate}</strong></p>
        </div>
        <p>We encourage you to pray for your partner${isSpecialPairing ? 's' : ''} daily and consider reaching out to them during this time.</p>
        ${customMessage ? `
        <div style="background-color: #ebf8ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4299e1;">
          <h3 style="color: #2b6cb0; margin-top: 0;">Message from Admin:</h3>
          <p style="color: #2c5282;">${customMessage}</p>
        </div>
        ` : ''}
        <p>May God bless your prayer journey together!</p>
        <p style="margin-top: 30px; text-align: center; color: #718096; font-size: 14px;">
          This is an automated message from the Prayer Partners system.
        </p>
      </div>
    `;

    // Prepare email data for Brevo API
    const emailData = {
      sender: {
        name: 'Prayer Partners',
        email: senderEmail
      },
      to: [{
        email: recipientEmail,
        name: recipientName
      }],
      subject: isSpecialPairing ? 'Your Special Prayer Partners Assignment' : 'Your Prayer Partner for This Month',
      htmlContent: htmlContent,
      // Add tags to help track this specific email
      tags: ['notification', 'prayer-partner'],
      // Add headers to reduce chance of spam filtering
      headers: {
        'X-Mailjet-TrackOpen': '0',
        'X-Mailjet-TrackClick': '0',
        'X-Mail-Type': 'Transactional'
      }
    };

    // Send the email using Brevo API
    const response = await brevoClient.post('/smtp/email', emailData);

    console.log('Prayer partner notification email sent successfully:', response.data);
    return {
      success: true,
      messageId: response.data.messageId
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error sending prayer partner notification:', error.message);

      if (isAxiosError(error)) {
        console.error('API Error Response Status:', error.response.status);
        console.error('API Error Response Data:', JSON.stringify(error.response.data, null, 2));

        return {
          success: false,
          error: error.response.data,
          status: error.response.status
        };
      }

      return {
        success: false,
        error: error.message,
        status: null
      };
    } else {
      console.error('Unknown error occurred:', error);
      return {
        success: false,
        error: 'Unknown error',
        status: null
      };
    }
  }
};

/**
 * Send reminder emails to all users
 */
export const sendReminderEmails = async (
  users: { id: number; email: string; firstName: string; lastName: string }[],
  endDate: Date
) => {
  try {
    if (users.length === 0) {
      return { success: false, message: 'No users to send reminders to' };
    }

    // Format end date
    const formattedEndDate = endDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Create email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568; text-align: center;">Prayer Request Reminder</h2>
        <p>Dear Member,</p>
        <p>This is a friendly reminder to submit your prayer request for the upcoming prayer partner assignment.</p>
        <p>The current prayer partner period will end on <strong>${formattedEndDate}</strong>.</p>
        <p>Please log in to your account and submit your prayer request as soon as possible.</p>
        <p>Thank you for being part of our prayer community!</p>
        <p style="margin-top: 30px; text-align: center; color: #718096; font-size: 14px;">
          This is an automated message from the Prayer Partners system.
        </p>
      </div>
    `;

    // Send emails to each user individually
    const results = [];
    for (const user of users) {
      try {
        // Prepare email data for Brevo API
        const emailData = {
          sender: {
            name: 'Prayer Partners',
            email: senderEmail
          },
          to: [{
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
          }],
          subject: 'Reminder: Submit Your Prayer Request',
          htmlContent: htmlContent,
          // Add tags to help track this specific email
          tags: ['reminder', 'prayer-request'],
          // Add headers to reduce chance of spam filtering
          headers: {
            'X-Mailjet-TrackOpen': '0',
            'X-Mailjet-TrackClick': '0',
            'X-Mail-Type': 'Transactional'
          }
        };

        // Send the email using Brevo API
        const response = await brevoClient.post('/smtp/email', emailData);

        results.push({
          email: user.email,
          success: true,
          messageId: response.data.messageId
        });
      } catch (emailError) {
        if (emailError instanceof Error) {
          console.error(`Error sending reminder to ${user.email}:`, emailError.message);

          if (isAxiosError(emailError)) {
            console.error('API Error Response Status:', emailError.response.status);
            console.error('API Error Response Data:', JSON.stringify(emailError.response.data, null, 2));

            results.push({
              email: user.email,
              success: false,
              error: emailError.response.data,
              status: emailError.response.status
            });
          } else {
            results.push({
              email: user.email,
              success: false,
              error: emailError.message,
              status: null
            });
          }
        } else {
          console.error('Unknown error occurred:', emailError);
          results.push({
            email: user.email,
            success: false,
            error: 'Unknown error',
            status: null
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Sent ${successCount} of ${users.length} reminder emails successfully`);

    return {
      success: successCount > 0,
      totalCount: users.length,
      successCount: successCount,
      results: results
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error sending reminder emails:', error.message);

      if (isAxiosError(error)) {
        console.error('API Error Response Status:', error.response.status);
        console.error('API Error Response Data:', JSON.stringify(error.response.data, null, 2));

        return {
          success: false,
          error: error.response.data,
          status: error.response.status
        };
      }

      return {
        success: false,
        error: error.message,
        status: null
      };
    } else {
      console.error('Unknown error occurred:', error);
      return {
        success: false,
        error: 'Unknown error',
        status: null
      };
    }
  }
};

/**
 * Send welcome email to new members
 */
export const sendWelcomeEmail = async (
  recipientEmail: string,
  recipientName: string
) => {
  try {
    // Create email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568; text-align: center;">Welcome to Prayer Partners!</h2>
        <p>Dear ${recipientName},</p>
        <p>Thank you for joining our Prayer Partners community. We're excited to have you with us!</p>
        <p>Here's what you can expect:</p>
        <ul>
          <li>Monthlyly prayer partner assignments</li>
          <li>Guided prayer themes</li>
          <li>A supportive community of prayer warriors</li>
        </ul>
        <p>You'll receive your first prayer partner assignment soon. In the meantime, you can log in to your account to update your profile and preferences.</p>
        <p>May God bless you on this prayer journey!</p>
        <p style="margin-top: 30px; text-align: center; color: #718096; font-size: 14px;">
          This is an automated message from the Prayer Partners system.
        </p>
      </div>
    `;

    // Prepare email data for Brevo API
    const emailData = {
      sender: {
        name: 'Prayer Partners',
        email: senderEmail
      },
      to: [{
        email: recipientEmail,
        name: recipientName
      }],
      subject: 'Welcome to Prayer Partners!',
      htmlContent: htmlContent,
      // Add tags to help track this specific email
      tags: ['welcome', 'registration'],
      // Add headers to reduce chance of spam filtering
      headers: {
        'X-Mailjet-TrackOpen': '0',
        'X-Mailjet-TrackClick': '0',
        'X-Mail-Type': 'Transactional'
      }
    };

    // Send the email using Brevo API
    const response = await brevoClient.post('/smtp/email', emailData);

    console.log('Welcome email sent successfully:', response.data);
    return {
      success: true,
      messageId: response.data.messageId
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error sending welcome email:', error.message);

      if (isAxiosError(error)) {
        console.error('API Error Response Status:', error.response.status);
        console.error('API Error Response Data:', JSON.stringify(error.response.data, null, 2));

        return {
          success: false,
          error: error.response.data,
          status: error.response.status
        };
      }

      return {
        success: false,
        error: error.message,
        status: null
      };
    } else {
      console.error('Unknown error occurred:', error);
      return {
        success: false,
        error: 'Unknown error',
        status: null
      };
    }
  }
};
