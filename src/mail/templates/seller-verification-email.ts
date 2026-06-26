interface ApprovedParams {
  name: string;
  locale: string;
}
interface RejectedParams {
  name: string;
  reason: string;
  locale: string;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const COPY = {
  approved: {
    en: {
      subject: 'Your ClosetX seller account is verified',
      eyebrow: 'Verification approved',
      heading: "You're a verified seller",
      greet: (n: string) => (n ? `Hi ${esc(n)},` : 'Hi,'),
      body: 'Your identity and payout details have been verified. The verified-seller badge is now active across your shop, and you can publish listings.',
      cta: 'Go to Seller Studio',
    },
    ar: {
      subject: 'تم توثيق حساب البائع الخاص بك على ClosetX',
      eyebrow: 'تم اعتماد التوثيق',
      heading: 'أصبحت بائعاً موثّقاً',
      greet: (n: string) => (n ? `مرحباً ${esc(n)},` : 'مرحباً,'),
      body: 'تم التحقق من هويتك وبيانات الدفع. أصبح شارة البائع الموثّق مفعّلة في متجرك، ويمكنك الآن نشر قوائمك.',
      cta: 'الذهاب إلى استوديو البائع',
    },
  },
  rejected: {
    en: {
      subject: 'Action needed: ClosetX seller verification',
      eyebrow: 'Verification update',
      heading: 'We couldn’t verify your account yet',
      greet: (n: string) => (n ? `Hi ${esc(n)},` : 'Hi,'),
      body: 'Your seller verification needs another look. Please review the reason below, correct it, and resubmit — your draft listings are preserved.',
      reasonLabel: 'Reason',
      cta: 'Resubmit verification',
    },
    ar: {
      subject: 'مطلوب إجراء: توثيق البائع على ClosetX',
      eyebrow: 'تحديث التوثيق',
      heading: 'لم نتمكن من توثيق حسابك بعد',
      greet: (n: string) => (n ? `مرحباً ${esc(n)},` : 'مرحباً,'),
      body: 'يحتاج توثيق البائع إلى مراجعة إضافية. يرجى الاطّلاع على السبب أدناه وتصحيحه وإعادة الإرسال — قوائمك المسودّة محفوظة.',
      reasonLabel: 'السبب',
      cta: 'إعادة إرسال التوثيق',
    },
  },
};

function pick<T>(map: { en: T; ar: T }, locale: string): T {
  return locale?.toLowerCase().startsWith('ar') ? map.ar : map.en;
}

function shell(opts: {
  dir: 'ltr' | 'rtl';
  eyebrow: string;
  heading: string;
  inner: string;
  ctaUrl: string;
  ctaLabel: string;
}): string {
  const align = opts.dir === 'rtl' ? 'right' : 'left';
  return `<!DOCTYPE html><html dir="${opts.dir}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1efee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efee;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#fff;border-radius:18px;overflow:hidden;">
<tr><td style="background:#161f33;padding:28px 40px;" align="center">
<div style="font-family:Georgia,serif;font-size:28px;font-weight:bold;"><span style="color:#fff;">Closet</span><span style="color:#c1a36f;">X</span></div></td></tr>
<tr><td dir="${opts.dir}" style="padding:40px 40px 8px 40px;text-align:${align};">
<p style="margin:0 0 6px 0;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#2e6f5e;">${esc(opts.eyebrow)}</p>
<h1 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#111;font-weight:500;">${esc(opts.heading)}</h1>
${opts.inner}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px 0;"><tr><td align="center" bgcolor="#2e6f5e" style="border-radius:12px;">
<a href="${opts.ctaUrl}" target="_blank" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;border-radius:12px;background:#2e6f5e;">${esc(opts.ctaLabel)}</a>
</td></tr></table></td></tr>
<tr><td style="background:#f8f5f4;padding:22px 40px;" align="center"><p style="margin:0;font-size:12px;color:#9a9a9a;">&copy; 2026 ClosetX Trading Co. &middot; Riyadh</p></td></tr>
</table></td></tr></table></body></html>`;
}

export function sellerApprovedHtml({ name, locale }: ApprovedParams, ctaUrl: string): string {
  const c = pick(COPY.approved, locale);
  const dir = locale?.toLowerCase().startsWith('ar') ? 'rtl' : 'ltr';
  return shell({
    dir,
    eyebrow: c.eyebrow,
    heading: c.heading,
    inner: `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.65;color:#444;">${c.greet(name)}</p><p style="margin:0;font-size:15px;line-height:1.65;color:#6b6b6b;">${esc(c.body)}</p>`,
    ctaUrl,
    ctaLabel: c.cta,
  });
}

export function sellerApprovedText({ name, locale }: ApprovedParams, ctaUrl: string): string {
  const c = pick(COPY.approved, locale);
  return [c.greet(name).replace(/<[^>]+>/g, ''), '', c.body, ctaUrl, '', '— ClosetX'].join('\n');
}

export function sellerRejectedHtml({ name, reason, locale }: RejectedParams, ctaUrl: string): string {
  const c = pick(COPY.rejected, locale);
  const dir = locale?.toLowerCase().startsWith('ar') ? 'rtl' : 'ltr';
  return shell({
    dir,
    eyebrow: c.eyebrow,
    heading: c.heading,
    inner: `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.65;color:#444;">${c.greet(name)}</p><p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#6b6b6b;">${esc(c.body)}</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;"><tr><td style="background:#fdecec;border-radius:12px;padding:14px 16px;"><p style="margin:0 0 4px 0;font-size:12px;font-weight:700;text-transform:uppercase;color:#c0392b;">${esc(c.reasonLabel)}</p><p style="margin:0;font-size:14px;line-height:1.55;color:#7a2c25;">${esc(reason)}</p></td></tr></table>`,
    ctaUrl,
    ctaLabel: c.cta,
  });
}

export function sellerRejectedText({ name, reason, locale }: RejectedParams, ctaUrl: string): string {
  const c = pick(COPY.rejected, locale);
  return [
    c.greet(name).replace(/<[^>]+>/g, ''),
    '',
    c.body,
    `${c.reasonLabel}: ${reason}`,
    ctaUrl,
    '',
    '— ClosetX',
  ].join('\n');
}

export function sellerApprovedSubject(locale: string): string {
  return pick(COPY.approved, locale).subject;
}
export function sellerRejectedSubject(locale: string): string {
  return pick(COPY.rejected, locale).subject;
}
