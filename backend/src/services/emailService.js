const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // For development, use console logging or ethereal
      if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
        console.log('📧 Email service: Development mode - emails will be logged to console');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Verify connection
      await this.transporter.verify();
      console.log('📧 Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.transporter = null;
    }
  }

  async sendWelcomeEmail(userEmail, username) {
    const subject = 'Welcome to Golf Tournament App!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2e7d32; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .button { background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏌️ Welcome to Golf Tournament App!</h1>
          </div>
          <div class="content">
            <h2>Hello ${username}!</h2>
            <p>Welcome to the Golf Tournament App! Your account has been successfully created.</p>

            <p><strong>Your login details:</strong></p>
            <ul>
              <li><strong>Email:</strong> ${userEmail}</li>
              <li><strong>Username:</strong> ${username}</li>
            </ul>

            <p>You can now:</p>
            <ul>
              <li>Create golf tournaments with your friends</li>
              <li>Add golf courses from Portugal and UK</li>
              <li>Track scores and compete on leaderboards</li>
              <li>Share tournament IDs to invite others</li>
            </ul>

            <a href="${process.env.APP_URL}" class="button">🎯 Start Playing Golf!</a>

            <p>Have fun and may the best golfer win!</p>
            <p>The Golf Tournament App Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  async sendPasswordResetEmail(userEmail, username, resetToken) {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset - Golf Tournament App';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .button { background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${username}!</h2>
            <p>We received a request to reset your password for your Golf Tournament App account.</p>

            <p>If you requested this password reset, click the button below:</p>

            <a href="${resetUrl}" class="button">🔑 Reset Your Password</a>

            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this reset, you can safely ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>

            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 3px;">${resetUrl}</p>

            <p>Happy golfing!</p>
            <p>The Golf Tournament App Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  async sendEmail(to, subject, html) {
    try {
      // Development mode - log to console
      if (process.env.NODE_ENV === 'development' && !this.transporter) {
        console.log('\n📧 EMAIL WOULD BE SENT:');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Content:', html.replace(/<[^>]*>/g, '').substring(0, 200) + '...');
        console.log('📧 EMAIL LOG END\n');
        return { success: true, messageId: 'dev-mode-log' };
      }

      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Golf Tournament App <noreply@golftournament.app>',
        to: to,
        subject: subject,
        html: html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully to ${to}: ${info.messageId}`);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();