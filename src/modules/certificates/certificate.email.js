export const sendCertificateEmail = async ({ certificate, pdfBuffer }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CERTIFICATE_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Certificate email is not configured. Set RESEND_API_KEY and CERTIFICATE_FROM_EMAIL.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [certificate.studentEmail],
      subject: `Your KPX Academy certificate — ${certificate.trainingProgramTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
          <h2>Congratulations, ${escapeHtml(certificate.studentName)}!</h2>
          <p>Your KPX Academy certificate for <strong>${escapeHtml(certificate.trainingProgramTitle)}</strong> is attached to this email.</p>
          <p>Certificate number: <strong>${escapeHtml(certificate.certificateNumber)}</strong></p>
          <p>Keep this certificate number for future verification.</p>
          <p>Regards,<br/>KPX Academy</p>
        </div>
      `,
      attachments: [{
        filename: `${certificate.certificateNumber}.pdf`,
        content: pdfBuffer.toString("base64"),
      }],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Certificate email failed (${response.status}): ${message.slice(0, 500)}`);
  }

  return response.json();
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
