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

export const sendWorkshopBookingAccessCodeEmail = async ({ id, name, email, publicReference, workshopTitle, code, expiresInMinutes = 5 }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TRANSACTIONAL_FROM_EMAIL || process.env.CERTIFICATE_FROM_EMAIL;
  const replyTo = process.env.SUPPORT_REPLY_TO_EMAIL;
  if (!apiKey || !from) throw new Error("Transactional email is not configured.");
  const safeName = escapeHtml(name);
  const safeReference = escapeHtml(publicReference);
  const safeTitle = escapeHtml(workshopTitle);
  const safeCode = escapeHtml(code);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `workshop-booking-access-code-${id}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: "Your KPX Academy workshop verification code",
      text: [
        `Hello ${name},`, "",
        `Your verification code for workshop booking ${publicReference} is ${code}.`,
        `It expires in ${expiresInMinutes} minutes and can only be used once.`,
        "If you did not request this code, you can ignore this email.",
        "", "KPX Academy",
      ].join("\n"),
      html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#222;max-width:600px;margin:auto"><h2 style="color:#17324D">Verify your workshop booking</h2><p>Hello ${safeName},</p><p>Use this code to access the status of <strong>${safeTitle}</strong> (<strong>${safeReference}</strong>):</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#17324D;padding:16px 0">${safeCode}</p><p>This code expires in ${expiresInMinutes} minutes and can only be used once.</p><p>If you did not request this code, ignore this email.</p><p>Regards,<br/><strong>KPX Academy</strong></p></div>`,
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${message.slice(0, 500)}`);
  }
  return response.json();
};


const souvenirNotificationCopy = (type) => ({
  ORDER_SUBMITTED: { subject: "We received your KPX Academy souvenir order", heading: "Souvenir order received", message: "Your souvenir order has been received. We will keep you updated as it moves through payment and production." },
  ORDER_STATUS_UPDATED: { subject: "Your KPX Academy souvenir order has been updated", heading: "Order status update", message: "There is an update to your souvenir order." },
  ORDER_PAYMENT_CONFIRMED: { subject: "Payment confirmed for your KPX Academy souvenir order", heading: "Payment confirmed", message: "Your payment has been verified and your souvenir order is now paid." },
  ENQUIRY_SUBMITTED: { subject: "We received your custom souvenir enquiry", heading: "Custom enquiry received", message: "Thank you for sharing your custom souvenir brief. Our team will review it and follow up with you." },
  ENQUIRY_STATUS_UPDATED: { subject: "Your KPX Academy souvenir enquiry has been updated", heading: "Enquiry update", message: "There is an update to your custom souvenir enquiry." },
  QUOTE_SENT: { subject: "Your KPX Academy custom souvenir quotation is ready", heading: "Your quotation is ready", message: "KPX Academy has prepared a quotation for your custom souvenir enquiry. Review the details below." },
  QUOTE_ACCEPTED: { subject: "We received your quotation acceptance", heading: "Quotation accepted", message: "Thank you. Your acceptance has been recorded. Our team will contact you with the next steps." },
  QUOTE_DECLINED: { subject: "We received your quotation response", heading: "Quotation declined", message: "Your decision has been recorded. If you would like to discuss an alternative, reply to this email." },
})[type];

export const sendSouvenirNotificationEmail = async ({
  id, notificationType, name, email, publicReference, productName, quantity,
  totalPrice, currency = "NGN", accessUrl, previousStatus, newStatus,
  customerMessage, quoteVersion, quoteTotal, quoteMessage, quoteTerms,
  quoteExpiresAt, quoteItems = [],
}) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TRANSACTIONAL_FROM_EMAIL || process.env.CERTIFICATE_FROM_EMAIL;
  const replyTo = process.env.SUPPORT_REPLY_TO_EMAIL;
  if (!apiKey || !from) throw new Error("Transactional email is not configured.");
  const copy = souvenirNotificationCopy(notificationType);
  if (!copy) {
    const error = new Error(`Unsupported souvenir notification type: ${notificationType}`);
    error.permanent = true;
    throw error;
  }
  const safeName = escapeHtml(name);
  const safeProduct = escapeHtml(productName || "Custom souvenir");
  const safeReference = escapeHtml(publicReference);
  const safeMessage = escapeHtml(customerMessage || "");
  const safeQuoteMessage = escapeHtml(quoteMessage || "");
  const safeQuoteTerms = escapeHtml(quoteTerms || "");
  const formatMoney = (value) => value == null ? "Not specified" : new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(Number(value));
  const quoteRows = quoteItems.map((item) => `${item.name} × ${item.quantity}: ${formatMoney(item.lineTotal)}`);
  const quoteHtml = quoteItems.map((item) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.name)} × ${Number(item.quantity)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(formatMoney(item.lineTotal))}</td></tr>`).join("");
  const accessLink = accessUrl ? `<p style="margin:24px 0"><a href="${escapeHtml(accessUrl)}" style="display:inline-block;padding:12px 18px;background:#17324D;color:#fff;text-decoration:none;border-radius:6px">View your private souvenir page</a></p>` : "";
  const statusLine = newStatus ? `Status: ${newStatus.replaceAll("_", " ")}` : "";
  const previousLine = previousStatus ? `Previous status: ${previousStatus.replaceAll("_", " ")}` : "";
  const quoteText = quoteItems.length ? [`Quotation version: ${quoteVersion}`, ...quoteRows, `Total: ${formatMoney(quoteTotal)}`, quoteTerms ? `Terms: ${quoteTerms}` : "", quoteExpiresAt ? `Expires: ${new Date(quoteExpiresAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}` : ""].filter(Boolean).join("\\n") : "";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `souvenir-notification-${id}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: copy.subject,
      text: [`Hello ${name},`, "", copy.message, `Item: ${productName || "Custom souvenir"}`, `Reference: ${publicReference}`, statusLine, previousLine, quantity ? `Quantity: ${quantity}` : "", totalPrice ? `Order total: ${formatMoney(totalPrice)}` : "", quoteText, quoteMessage || "", quoteTerms ? `Terms: ${quoteTerms}` : "", customerMessage ? `Message from KPX Academy: ${customerMessage}` : "", accessUrl ? `Private tracking page: ${accessUrl}` : "Use the private tracking link in your original acknowledgement email to view the latest details.", "", "Regards,", "KPX Academy"].filter(Boolean).join("\\n"),
      html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#222;max-width:620px;margin:auto"><h2 style="color:#17324D">${copy.heading}</h2><p>Hello ${safeName},</p><p>${copy.message}</p><p><strong>Item:</strong> ${safeProduct}<br/><strong>Reference:</strong> ${safeReference}</p>${statusLine ? `<p><strong>${escapeHtml(statusLine)}</strong></p>` : ""}${previousLine ? `<p>${escapeHtml(previousLine)}</p>` : ""}${quantity ? `<p><strong>Quantity:</strong> ${Number(quantity)}</p>` : ""}${totalPrice ? `<p><strong>Order total:</strong> ${escapeHtml(formatMoney(totalPrice))}</p>` : ""}${quoteItems.length ? `<h3 style="color:#17324D">Quotation · Version ${Number(quoteVersion)}</h3><table style="width:100%;border-collapse:collapse">${quoteHtml}<tr><td style="padding:10px;font-weight:bold">Total</td><td style="padding:10px;text-align:right;font-weight:bold">${escapeHtml(formatMoney(quoteTotal))}</td></tr></table>` : ""}${safeQuoteMessage ? `<p>${safeQuoteMessage}</p>` : ""}${safeQuoteTerms ? `<p><strong>Terms:</strong> ${safeQuoteTerms}</p>` : ""}${quoteExpiresAt ? `<p><strong>Quotation expires:</strong> ${escapeHtml(new Date(quoteExpiresAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }))}</p>` : ""}${safeMessage ? `<p><strong>Message from KPX Academy:</strong><br/>${safeMessage}</p>` : ""}${accessLink}<p>For further assistance, reply to this email.</p><p>Regards,<br/><strong>KPX Academy</strong></p></div>`,
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${message.slice(0, 500)}`);
  }
  return response.json();
};
