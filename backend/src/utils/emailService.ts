import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'EasyRecovery'}" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log('✅ Email sent:', info.messageId);
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error('Failed to send email');
  }
};

export const sendVerificationEmail = async (
  email: string,
  name: string,
  verificationToken: string
): Promise<void> => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/verify-email/${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);
          color: #ffffff;
          padding: 40px 30px;
          text-align: center;
        }
        .email-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .email-body {
          padding: 40px 30px;
        }
        .email-body h2 {
          color: #111827;
          font-size: 20px;
          margin-bottom: 20px;
        }
        .email-body p {
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .verify-button {
          display: inline-block;
          background: #1a73e8;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          transition: background 0.3s;
        }
        .verify-button:hover {
          background: #1557b0;
        }
        .alternative-link {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
          word-break: break-all;
          font-size: 12px;
          color: #6b7280;
        }
        .email-footer {
          background: #f9fafb;
          padding: 30px;
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
        }
        .email-footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>📧 Verify Your Email</h1>
        </div>
        <div class="email-body">
          <h2>Hi ${name},</h2>
          <p>Welcome to EasyRecovery! We're excited to have you on board.</p>
          <p>To complete your registration and start selling your appliances, please verify your email address by clicking the button below:</p>

          <div style="text-align: center;">
            <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
          </div>

          <p>This verification link will expire in 24 hours.</p>

          <p><strong>If the button doesn't work</strong>, copy and paste this link into your browser:</p>
          <div class="alternative-link">${verificationUrl}</div>

          <p>If you didn't create an account with EasyRecovery, you can safely ignore this email.</p>
        </div>
        <div class="email-footer">
          <p><strong>EasyRecovery</strong></p>
          <p>Your trusted platform for buying and selling appliances</p>
          <p>© ${new Date().getFullYear()} EasyRecovery. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hi ${name},

    Welcome to EasyRecovery!

    Please verify your email address by visiting this link:
    ${verificationUrl}

    This link will expire in 24 hours.

    If you didn't create an account with EasyRecovery, you can safely ignore this email.

    Best regards,
    The EasyRecovery Team
  `;

  await sendEmail({
    to: email,
    subject: 'Verify Your Email - EasyRecovery',
    html,
    text,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: #ffffff;
          padding: 40px 30px;
          text-align: center;
        }
        .email-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .email-body {
          padding: 40px 30px;
        }
        .email-body h2 {
          color: #111827;
          font-size: 20px;
          margin-bottom: 20px;
        }
        .email-body p {
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .reset-button {
          display: inline-block;
          background: #dc2626;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          transition: background 0.3s;
        }
        .reset-button:hover {
          background: #b91c1c;
        }
        .alternative-link {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
          word-break: break-all;
          font-size: 12px;
          color: #6b7280;
        }
        .warning-box {
          background: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning-box p {
          margin: 0;
          color: #991b1b;
        }
        .email-footer {
          background: #f9fafb;
          padding: 30px;
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
        }
        .email-footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>🔒 Reset Your Password</h1>
        </div>
        <div class="email-body">
          <h2>Hi ${name},</h2>
          <p>We received a request to reset your password for your EasyRecovery account.</p>
          <p>Click the button below to reset your password:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="reset-button">Reset Password</a>
          </div>

          <p>This password reset link will expire in 1 hour for security reasons.</p>

          <p><strong>If the button doesn't work</strong>, copy and paste this link into your browser:</p>
          <div class="alternative-link">${resetUrl}</div>

          <div class="warning-box">
            <p><strong>⚠️ Important:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
        </div>
        <div class="email-footer">
          <p><strong>EasyRecovery</strong></p>
          <p>Your trusted platform for buying and selling appliances</p>
          <p>© ${new Date().getFullYear()} EasyRecovery. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hi ${name},

    We received a request to reset your password for your EasyRecovery account.

    Reset your password by visiting this link:
    ${resetUrl}

    This link will expire in 1 hour.

    If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

    Best regards,
    The EasyRecovery Team
  `;

  await sendEmail({
    to: email,
    subject: 'Reset Your Password - EasyRecovery',
    html,
    text,
  });
};
