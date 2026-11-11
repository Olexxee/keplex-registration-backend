const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);

export const sendTrainingTelegramAccessEmail = async ({ id, name, email, programTitle, telegramGroupUrl }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TRANSACTIONAL_FROM_EMAIL || process.env.CERTIFICATE_FROM_EMAIL;
  const replyTo = process.env.SUPPORT_REPLY_TO_EMAIL;
  if (!apiKey || !from) throw new Error("Transactional email is not configured. Set RESEND_API_KEY and TRANSACTIONAL_FROM_EMAIL.");

  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(programTitle);
  const safeUrl = escapeHtml(telegramGroupUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `training-telegram-access-${id}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: "Payment confirmed — your KPX Academy training access",
      text: [
        `Hello ${name},`, "",
        `Your payment for ${programTitle} has been confirmed.`,
        "You are now registered for the training.", "",
        `Join your training group: ${telegramGroupUrl}`, "",
        "Please join using the name and email address used during registration.",
        "If you have difficulty accessing the group, reply to this email.", "",
        "KPX Academy",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#222;max-width:600px;margin:auto">
          <h2 style="color:#17324D">Payment confirmed</h2>
          <p>Hello ${safeName},</p>
          <p>Your payment for <strong>${safeTitle}</strong> has been confirmed. You are now registered for the training.</p>
          <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:13px 20px;background:#17324D;color:#fff;text-decoration:none;border-radius:6px">Join your training group</a></p>
          <p>Please join using the name and email address used during registration.</p>
          <p>If you have difficulty accessing the group, reply to this email.</p>
          <p>Regards,<br/><strong>KPX Academy</strong></p>
        </div>
      `,
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${message.slice(0, 500)}`);
  }
  return response.json();
};

const workshopNotificationCopy = (notificationType) => ({
  PROPOSAL_SENT: {
    subject: "Your KPX Academy workshop proposal is ready",
    heading: "Workshop proposal update",
    message: "KPX Academy has prepared a proposal for your workshop request. Review the terms on your private booking page and accept or decline before the expiry date.",
  },
  CONFIRMED: {
    subject: "Your KPX Academy workshop is confirmed",
    heading: "Workshop confirmed",
    message: "Your workshop booking has been confirmed by KPX Academy.",
  },
  RESCHEDULED: {
    subject: "Your KPX Academy workshop date has changed",
    heading: "Workshop date updated",
    message: "KPX Academy has updated the preferred event date for your workshop booking.",
  },
  CANCELLED: {
    subject: "Your KPX Academy workshop request was cancelled",
    heading: "Workshop request cancelled",
    message: "Your workshop booking has been cancelled by KPX Academy.",
  },
})[notificationType];

export const sendWorkshopBookingNotification = async ({
  id, notificationType, name, email, publicReference, workshopTitle,
  previousEventDate, newEventDate, customerMessage,
  proposalPrice, proposalDetails, proposalExpiresAt, currency = "NGN",
}) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TRANSACTIONAL_FROM_EMAIL || process.env.CERTIFICATE_FROM_EMAIL;
  const replyTo = process.env.SUPPORT_REPLY_TO_EMAIL;
  if (!apiKey || !from) throw new Error("Transactional email is not configured.");
  const copy = workshopNotificationCopy(notificationType);
  if (!copy) throw new Error(`Unsupported workshop notification type: ${notificationType}`);

  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(workshopTitle);
  const safeReference = escapeHtml(publicReference);
  const safeMessage = escapeHtml(customerMessage || "");
  const safeProposalDetails = escapeHtml(proposalDetails || "");
  const formatMoney = (value) => value == null ? "Not specified" : new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(Number(value));
  const formatDate = (value) => value
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(value))
    : "Not specified";
  const dateLine = notificationType === "RESCHEDULED"
    ? `Previous date: ${formatDate(previousEventDate)}\nNew date: ${formatDate(newEventDate)}`
    : `Preferred event date: ${formatDate(newEventDate)}`;
  const messageText = customerMessage ? `\n\nMessage from KPX Academy: ${customerMessage}` : "";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `workshop-booking-notification-${id}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: copy.subject,
      text: [
        `Hello ${name},`, "",
        copy.message,
        `Workshop: ${workshopTitle}`,
        `Booking reference: ${publicReference}`,
        dateLine,
        ...(notificationType === "PROPOSAL_SENT" ? [`Proposed price: ${formatMoney(proposalPrice)}`, `Proposal details: ${proposalDetails || "See your private booking page"}`, `Proposal expires: ${formatDate(proposalExpiresAt)}`] : []),
        messageText,
        "",
        "Use the private booking link provided when you submitted the request to review its latest status and details.",
        "",
        "KPX Academy",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#222;max-width:600px;margin:auto">
          <h2 style="color:#17324D">${copy.heading}</h2>
          <p>Hello ${safeName},</p>
          <p>${copy.message}</p>
          <p><strong>Workshop:</strong> ${safeTitle}<br/><strong>Booking reference:</strong> ${safeReference}</p>
          ${notificationType === "PROPOSAL_SENT" ? `<p><strong>Proposed price:</strong> ${formatMoney(proposalPrice)}<br/><strong>Proposal expires:</strong> ${formatDate(proposalExpiresAt)}</p><p><strong>Proposal details:</strong><br/>${safeProposalDetails}</p>` : ""}
          ${notificationType === "RESCHEDULED"
            ? `<p><strong>Previous date:</strong> ${formatDate(previousEventDate)}<br/><strong>New date:</strong> ${formatDate(newEventDate)}</p>`
            : `<p><strong>Event date:</strong> ${formatDate(newEventDate)}</p>`}
          ${safeMessage ? `<p><strong>Message from KPX Academy:</strong><br/>${safeMessage}</p>` : ""}
          <p>Use the private booking link provided when you submitted the request to review its latest status and details.</p>
          <p>Regards,<br/><strong>KPX Academy</strong></p>
        </div>
      `,
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${message.slice(0, 500)}`);
  }
  return response.json();
};
