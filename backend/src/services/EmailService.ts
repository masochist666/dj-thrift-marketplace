import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: any;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to,
        subject,
        html
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}`);
    } catch (error) {
      logger.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, username: string) {
    const html = `
      <h1>Welcome to DJ Thrift Marketplace!</h1>
      <p>Hi ${username},</p>
      <p>Welcome to the DJ Thrift Marketplace! Start trading tracks with other DJs.</p>
      <p>Happy trading!</p>
    `;
    
    await this.sendEmail(email, 'Welcome to DJ Thrift Marketplace!', html);
  }

  async sendTradeNotification(email: string, tradeDetails: any) {
    const html = `
      <h1>New Trade Proposal</h1>
      <p>You have received a new trade proposal.</p>
      <p>Details: ${JSON.stringify(tradeDetails)}</p>
    `;
    
    await this.sendEmail(email, 'New Trade Proposal', html);
  }
}