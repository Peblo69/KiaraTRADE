interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable must be set');
    }

    console.log('Sending email to:', params.to);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend email error:', error);
      return false;
    }

    console.log('Email sent successfully to:', params.to);
    return true;
  } catch (error) {
    console.error('Resend email error:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${token}`;

  return sendEmail({
    to: email,
    from: 'Kiara AI <no-reply@kiaraaicrypto.com>',
    subject: '🌟 Verify Your Kiara AI Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8b5cf6; margin-bottom: 10px;">Welcome to Kiara AI</h1>
          <p style="font-size: 18px; color: #d1d5db;">Your Gateway to Advanced Crypto Intelligence</p>
        </div>

        <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #8b5cf6; margin-bottom: 15px;">One Last Step!</h2>
          <p style="color: #d1d5db; line-height: 1.6;">
            Thank you for joining Kiara AI. To activate your account and access our advanced crypto analysis tools, please verify your email address.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 14px;">
            Button not working? Copy and paste this link into your browser:
            <br>
            <span style="color: #8b5cf6; word-break: break-all;">${verificationUrl}</span>
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #374151;">
          <p style="color: #9ca3af; font-size: 14px;">
            If you didn't create a Kiara AI account, you can safely ignore this email.
            <br>This link will expire in 24 hours for security purposes.
          </p>
        </div>
      </div>
    `,
  });
}