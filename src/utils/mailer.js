import nodemailer from 'nodemailer';

export async function sendSmartEmail({ to, subject, html, text, skipGmail = false }) {
  // Collect active providers dynamically on every call so env changes take effect
  const gmailAccounts = [
    { user: process.env.GMAIL_USER_1, pass: (process.env.GMAIL_PASS_1 || "").replace(/\s+/g, "") },
    { user: process.env.GMAIL_USER_2, pass: (process.env.GMAIL_PASS_2 || "").replace(/\s+/g, "") },
  ].filter(acc => acc.user && acc.pass);

  const mailjetAccounts = [
    { user: process.env.MAILJET_API_KEY_1, pass: (process.env.MAILJET_SECRET_KEY_1 || "").trim() },
    { user: process.env.MAILJET_API_KEY_2, pass: (process.env.MAILJET_SECRET_KEY_2 || "").trim() },
  ].filter(acc => acc.user && acc.pass);

  const brevoAccounts = (process.env.BREVO_USER && process.env.BREVO_PASS)
    ? [{ user: process.env.BREVO_USER.trim(), pass: process.env.BREVO_PASS.trim() }]
    : [];

  const providers = [];

  const shouldSkipGmail = skipGmail || process.env.SKIP_GMAIL === 'true';

  // Add Gmails if not skipped
  if (!shouldSkipGmail) {
    gmailAccounts.forEach((acc, index) => {
      providers.push({
        name: `Gmail-Account-${index + 1}`,
        transport: {
          service: 'gmail',
          auth: acc,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
        },
      });
    });
  }

  // Add Mailjets
  mailjetAccounts.forEach((acc, index) => {
    providers.push({
      name: `Mailjet-Account-${index + 1}`,
      transport: {
        host: 'in-v3.mailjet.com',
        port: 587,
        secure: false,
        auth: acc,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
      },
    });
  });

  // Add Brevo if configured
  brevoAccounts.forEach((acc) => {
    providers.push({
      name: 'Brevo',
      transport: {
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: acc,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
      },
    });
  });

  if (providers.length === 0) {
    throw new Error('No email providers configured in .env file.');
  }

  let lastError = null;

  for (const provider of providers) {
    try {
      const transporter = nodemailer.createTransport(provider.transport);
      
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
      
      console.log(`Email sent successfully to ${to} via ${provider.name}`);
      return { success: true, provider: provider.name };
    } catch (error) {
      console.error(`${provider.name} failed for ${to}:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`All active email providers failed. Last error: ${lastError?.message}`);
}