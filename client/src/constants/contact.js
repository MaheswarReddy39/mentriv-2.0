export const SUPPORT_EMAIL = 'maheswarreddygondireddy12@gmail.com';

export function supportMailto(email, subject = 'Mentriv login help') {
  const body = email
    ? `Hi Mentriv team,\n\nI need help logging in.\n\nAccount email: ${email}\n\n`
    : 'Hi Mentriv team,\n\nI need help logging in.\n\n';

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}