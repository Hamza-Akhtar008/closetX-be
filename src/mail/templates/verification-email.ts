interface VerificationEmailParams {
  name: string;
  verifyUrl: string;
  expiresInHours: number;
}

/**
 * Branded verification email. Table-based layout with inline styles so it
 * renders consistently across email clients (Gmail, Outlook, Apple Mail).
 */
export function verificationEmailHtml({
  name,
  verifyUrl,
  expiresInHours,
}: VerificationEmailParams): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Welcome to ClosetX,';
  const hours = expiresInHours === 1 ? '1 hour' : `${expiresInHours} hours`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Verify your ClosetX email</title>
</head>
<body style="margin:0;padding:0;background-color:#f1efee;-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:#f1efee;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Confirm your email to start buying and selling on ClosetX.</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1efee;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(17,17,17,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color:#161f33;padding:30px 40px;" align="center">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:bold;letter-spacing:0.5px;">
                <span style="color:#ffffff;">Closet</span><span style="color:#c1a36f;">X</span>
              </div>
              <div style="margin-top:6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.55);">Relove &middot; Rewear &middot; Repeat</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:44px 40px 8px 40px;">
              <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#2e6f5e;">Confirm your email</p>
              <h1 style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:#111111;font-weight:500;">Verify your email address</h1>
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#444444;">${greeting}</p>
              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.65;color:#6b6b6b;">Thanks for joining ClosetX. Tap the button below to confirm this email address and finish setting up your account.</p>
              <!-- Bulletproof button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td align="center" bgcolor="#2e6f5e" style="border-radius:12px;">
                    <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:16px 38px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;background-color:#2e6f5e;">Verify Email Address</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px 0;font-size:13px;line-height:1.6;color:#8a8a8a;">This link expires in <strong style="color:#444444;">${hours}</strong>. If it stops working, request a new one from the app.</p>
              <p style="margin:0 0 4px 0;font-size:13px;line-height:1.6;color:#8a8a8a;">Button not working? Paste this link into your browser:</p>
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${verifyUrl}" target="_blank" style="color:#2e6f5e;text-decoration:underline;">${verifyUrl}</a></p>
            </td>
          </tr>
          <!-- Divider + reassurance -->
          <tr>
            <td style="padding:18px 40px 36px 40px;">
              <div style="height:1px;background-color:#e6e6e6;margin-bottom:22px;"></div>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#9a9a9a;">If you didn't create a ClosetX account, you can safely ignore this email — no account will be activated.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f5f4;padding:24px 40px;" align="center">
              <p style="margin:0 0 4px 0;font-size:12px;color:#9a9a9a;">&copy; 2026 ClosetX Trading Co. &middot; Riyadh &middot; Jeddah &middot; Dammam</p>
              <p style="margin:0;font-size:12px;color:#bdbdbd;">Authenticated pre-loved fashion, delivered across the Kingdom.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verificationEmailText({
  name,
  verifyUrl,
  expiresInHours,
}: VerificationEmailParams): string {
  const greeting = name ? `Hi ${name},` : 'Welcome to ClosetX,';
  const hours = expiresInHours === 1 ? '1 hour' : `${expiresInHours} hours`;
  return [
    greeting,
    '',
    'Thanks for joining ClosetX. Confirm your email address to finish setting up your account:',
    verifyUrl,
    '',
    `This link expires in ${hours}.`,
    "If you didn't create a ClosetX account, you can ignore this email.",
    '',
    '— ClosetX',
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
