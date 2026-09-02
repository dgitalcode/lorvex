function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildContactEnquiryEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  locale: string;
}) {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const subject = escapeHtml(input.subject);
  const message = escapeHtml(input.message).replaceAll("\n", "<br/>");
  const locale = escapeHtml(input.locale);
  return {
    subject: `[LORVEX] ${input.subject}`.slice(0, 200),
    html: `<!doctype html><html><body style="font-family:Georgia,serif;color:#12110f;">
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Locale:</strong> ${locale}</p>
<p><strong>Subject:</strong> ${subject}</p>
<p style="white-space:pre-wrap;">${message}</p>
</body></html>`,
  };
}
