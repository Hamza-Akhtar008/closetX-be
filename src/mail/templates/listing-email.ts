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
      subject: 'Your ClosetX listing is live',
      eyebrow: 'Listing approved',
      heading: 'Your listing is now active',
      greet: (n: string) => (n ? `Hi ${esc(n)},` : 'Hi,'),
      body: (t: string) =>
        `Your listing "${esc(t)}" has been approved and is now live in the marketplace.`,
      cta: 'View my listings',
    },
    ar: {
      subject: 'قائمتك على ClosetX أصبحت منشورة',
      eyebrow: 'تمت الموافقة على القائمة',
      heading: 'أصبحت قائمتك نشطة',
      greet: (n: string) => (n ? `مرحباً ${esc(n)},` : 'مرحباً,'),
      body: (t: string) =>
        `تمت الموافقة على قائمتك "${esc(t)}" وأصبحت الآن منشورة في السوق.`,
      cta: 'عرض قوائمي',
    },
  },
  rejected: {
    en: {
      subject: 'Your ClosetX listing needs changes',
      eyebrow: 'Listing update',
      heading: 'Your listing wasn’t approved',
      greet: (n: string) => (n ? `Hi ${esc(n)},` : 'Hi,'),
      body: (t: string) =>
        `Your listing "${esc(t)}" wasn’t approved. Review the reason below, update it, and resubmit.`,
      reasonLabel: 'Reason',
      cta: 'Edit my listing',
    },
    ar: {
      subject: 'قائمتك على ClosetX تحتاج إلى تعديل',
      eyebrow: 'تحديث القائمة',
      heading: 'لم تتم الموافقة على قائمتك',
      greet: (n: string) => (n ? `مرحباً ${esc(n)},` : 'مرحباً,'),
      body: (t: string) =>
        `لم تتم الموافقة على قائمتك "${esc(t)}". اطّلع على السبب أدناه وعدّلها وأعد الإرسال.`,
      reasonLabel: 'السبب',
      cta: 'تعديل قائمتي',
    },
  },
};

const isAr = (l: string) => l?.toLowerCase().startsWith('ar');

function shell(o: {
  dir: 'ltr' | 'rtl';
  eyebrow: string;
  heading: string;
  inner: string;
  ctaUrl: string;
  ctaLabel: string;
}): string {
  const align = o.dir === 'rtl' ? 'right' : 'left';
  return `<!DOCTYPE html><html dir="${o.dir}"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1efee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efee;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#fff;border-radius:18px;overflow:hidden;">
<tr><td style="background:#161f33;padding:28px 40px;" align="center"><div style="font-family:Georgia,serif;font-size:28px;font-weight:bold;"><span style="color:#fff;">Closet</span><span style="color:#c1a36f;">X</span></div></td></tr>
<tr><td dir="${o.dir}" style="padding:40px 40px 8px 40px;text-align:${align};">
<p style="margin:0 0 6px 0;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#2e6f5e;">${esc(o.eyebrow)}</p>
<h1 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#111;font-weight:500;">${esc(o.heading)}</h1>
${o.inner}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px 0;"><tr><td align="center" bgcolor="#2e6f5e" style="border-radius:12px;"><a href="${o.ctaUrl}" target="_blank" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;border-radius:12px;background:#2e6f5e;">${esc(o.ctaLabel)}</a></td></tr></table></td></tr>
<tr><td style="background:#f8f5f4;padding:22px 40px;" align="center"><p style="margin:0;font-size:12px;color:#9a9a9a;">&copy; 2026 ClosetX Trading Co. &middot; Riyadh</p></td></tr>
</table></td></tr></table></body></html>`;
}

export function listingApprovedSubject(locale: string): string {
  return (isAr(locale) ? COPY.approved.ar : COPY.approved.en).subject;
}
export function listingRejectedSubject(locale: string): string {
  return (isAr(locale) ? COPY.rejected.ar : COPY.rejected.en).subject;
}

export function listingApprovedHtml(name: string, title: string, locale: string, ctaUrl: string): string {
  const c = isAr(locale) ? COPY.approved.ar : COPY.approved.en;
  return shell({
    dir: isAr(locale) ? 'rtl' : 'ltr',
    eyebrow: c.eyebrow,
    heading: c.heading,
    inner: `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.65;color:#444;">${c.greet(name)}</p><p style="margin:0;font-size:15px;line-height:1.65;color:#6b6b6b;">${esc(c.body(title))}</p>`,
    ctaUrl,
    ctaLabel: c.cta,
  });
}
export function listingApprovedText(name: string, title: string, locale: string, ctaUrl: string): string {
  const c = isAr(locale) ? COPY.approved.ar : COPY.approved.en;
  return [c.greet(name).replace(/<[^>]+>/g, ''), '', c.body(title), ctaUrl, '', '— ClosetX'].join('\n');
}

export function listingRejectedHtml(name: string, title: string, reason: string, locale: string, ctaUrl: string): string {
  const c = isAr(locale) ? COPY.rejected.ar : COPY.rejected.en;
  return shell({
    dir: isAr(locale) ? 'rtl' : 'ltr',
    eyebrow: c.eyebrow,
    heading: c.heading,
    inner: `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.65;color:#444;">${c.greet(name)}</p><p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#6b6b6b;">${esc(c.body(title))}</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;"><tr><td style="background:#fdecec;border-radius:12px;padding:14px 16px;"><p style="margin:0 0 4px 0;font-size:12px;font-weight:700;text-transform:uppercase;color:#c0392b;">${esc(c.reasonLabel)}</p><p style="margin:0;font-size:14px;line-height:1.55;color:#7a2c25;">${esc(reason)}</p></td></tr></table>`,
    ctaUrl,
    ctaLabel: c.cta,
  });
}
export function listingRejectedText(name: string, title: string, reason: string, locale: string, ctaUrl: string): string {
  const c = isAr(locale) ? COPY.rejected.ar : COPY.rejected.en;
  return [c.greet(name).replace(/<[^>]+>/g, ''), '', c.body(title), `${c.reasonLabel}: ${reason}`, ctaUrl, '', '— ClosetX'].join('\n');
}
