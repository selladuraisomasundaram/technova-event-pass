import nodemailer from 'nodemailer';

// 1. Collect Gmail Accounts
const gmailAccounts = [
  { user: process.env.GMAIL_USER_1, pass: (process.env.GMAIL_PASS_1 || "").replace(/\s+/g, "") },
  { user: process.env.GMAIL_USER_2, pass: (process.env.GMAIL_PASS_2 || "").replace(/\s+/g, "") },
].filter(acc => acc.user && acc.pass);

// 2. Collect Mailjet Accounts
const mailjetAccounts = [
  { user: process.env.MAILJET_API_KEY_1, pass: process.env.MAILJET_SECRET_KEY_1 },
  { user: process.env.MAILJET_API_KEY_2, pass: process.env.MAILJET_SECRET_KEY_2 },
].filter(acc => acc.user && acc.pass);

const providers = [
  // Add Gmails to the list
  ...gmailAccounts.map((acc, index) => ({
    name: `Gmail-Account-${index + 1}`,
    transport: {
      service: 'gmail',
      auth: acc,
    },
  })),
  // Add Mailjets to the list
  ...mailjetAccounts.map((acc, index) => ({
    name: `Mailjet-Account-${index + 1}`,
    transport: {
      host: 'in-v3.mailjet.com',
      port: 587,
      auth: acc,
    },
  })),
  // Fallback to Brevo
  {
    name: 'Brevo',
    transport: {
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
      },
    },
  },
];

export async function sendSmartEmail({ to, subject, html, text }) {
  let lastError = null;

  for (const provider of providers) {
    try {
      const transporter = nodemailer.createTransport(provider.transport);
      
      // For Mailjet/Brevo, the 'from' email must be the one you verified in their dashboard
      const senderEmail = provider.name.includes('Gmail') 
        ? provider.transport.auth.user 
        : (process.env.VERIFIED_SENDER_EMAIL || provider.transport.auth.user);

      await transporter.sendMail({
        from: `"${process.env.SENDER_NAME || 'Event Team'}" <${senderEmail}>`,
        to,
        subject,
        html: html || (text ? text.replace(/\n/g, '<br>') : undefined),
        text,
      });
      
      console.log(`Email sent successfully via ${provider.name}`);
      return { success: true, provider: provider.name };
    } catch (error) {
      console.error(`${provider.name} failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`All email providers failed. Last error: ${lastError?.message}`);
}