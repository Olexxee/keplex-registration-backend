import { randomUUID } from "node:crypto";
import { cloudinary } from "../../config/cloudinary.js";

const pdfText = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const textCommand = (text, x, y, size, font = "F1", color = "0.09 0.20 0.30") =>
  `BT /CS ${color} cs /CS ${color} CS /F1 10 Tf ET\nBT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${pdfText(text)}) Tj ET\n`;

const centeredText = (text, y, size, font = "F1", color = "0.09 0.20 0.30") => {
  const safeText = String(text ?? "");
  const widthFactor = font === "F2" ? 0.56 : 0.51;
  const estimatedWidth = safeText.length * size * widthFactor;
  const x = Math.max(52, (842 - estimatedWidth) / 2);
  return textCommand(safeText, x, y, size, font, color);
};

const line = (x1, y1, x2, y2, color = "0.83 0.66 0.35", width = 1) =>
  `q ${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q\n`;

const rectangle = (x, y, width, height, color, stroke = false, lineWidth = 1) =>
  `q ${color} ${stroke ? "RG" : "rg"} ${lineWidth} w ${x} ${y} ${width} ${height} re ${stroke ? "S" : "f"} Q\n`;

const circle = (x, y, radius, color, stroke = false, lineWidth = 1) =>
  `q ${color} ${stroke ? "RG" : "rg"} ${lineWidth} w ${x - radius} ${y} m ${x - radius} ${y + radius * 0.5523} ${x - radius * 0.5523} ${y + radius} ${x} ${y + radius} c ${x + radius * 0.5523} ${y + radius} ${x + radius} ${y + radius * 0.5523} ${x + radius} ${y} c ${x + radius} ${y - radius * 0.5523} ${x + radius * 0.5523} ${y - radius} ${x} ${y - radius} c ${x - radius * 0.5523} ${y - radius} ${x - radius} ${y - radius * 0.5523} ${x - radius} ${y} c ${x - radius} ${y + radius * 0.5523} ${x - radius * 0.5523} ${y + radius} ${x} ${y + radius} c h ${stroke ? "S" : "f"} Q\n`;

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export const createCertificatePdf = ({
  studentName,
  trainingProgramTitle,
  certificateNumber,
  issuedAt,
}) => {
  const name = String(studentName ?? "").trim();
  const programme = String(trainingProgramTitle ?? "").trim();
  const nameSize = Math.min(30, Math.max(18, 30 - Math.max(0, name.length - 24) * 0.45));
  const programmeSize = Math.min(19, Math.max(13, 19 - Math.max(0, programme.length - 32) * 0.22));
  const date = formatDate(issuedAt);

  const content = [
    // Warm ivory paper with a restrained navy, teal and gold institutional frame.
    rectangle(0, 0, 842, 595, "0.969 0.961 0.941"),
    rectangle(18, 18, 806, 559, "0.09 0.20 0.30", true, 3),
    rectangle(29, 29, 784, 537, "0.17 0.50 0.50", true, 1),
    rectangle(42, 42, 758, 511, "0.83 0.66 0.35", true, 0.7),

    // Corner ornaments.
    line(42, 95, 82, 55, "0.83 0.66 0.35", 2),
    line(42, 55, 82, 95, "0.83 0.66 0.35", 2),
    line(760, 95, 800, 55, "0.83 0.66 0.35", 2),
    line(760, 55, 800, 95, "0.83 0.66 0.35", 2),
    line(42, 500, 82, 540, "0.83 0.66 0.35", 2),
    line(42, 540, 82, 500, "0.83 0.66 0.35", 2),
    line(760, 500, 800, 540, "0.83 0.66 0.35", 2),
    line(760, 540, 800, 500, "0.83 0.66 0.35", 2),

    // Academy wordmark and ornamental medallion.
    centeredText("KPX ACADEMY", 520, 18, "F2", "0.09 0.20 0.30"),
    centeredText("PRACTICAL SKILLS. MORE POSSIBILITIES.", 500, 7.5, "F1", "0.17 0.50 0.50"),
    line(350, 484, 492, 484, "0.83 0.66 0.35", 1.2),
    circle(421, 484, 3, "0.83 0.66 0.35"),

    centeredText("CERTIFICATE", 446, 29, "F2", "0.09 0.20 0.30"),
    centeredText("OF COMPLETION", 421, 12, "F2", "0.17 0.50 0.50"),
    centeredText("This certificate is proudly presented to", 382, 11, "F1", "0.25 0.29 0.31"),
    centeredText(name, 339, nameSize, "F2", "0.09 0.20 0.30"),
    line(170, 326, 672, 326, "0.83 0.66 0.35", 1.2),
    centeredText("for successfully completing the training programme in", 299, 11, "F1", "0.25 0.29 0.31"),
    centeredText(programme, 268, programmeSize, "F2", "0.17 0.50 0.50"),

    // Formal credential details and signature lines.
    line(100, 205, 742, 205, "0.83 0.66 0.35", 0.8),
    centeredText("AWARDED BY KPX ACADEMY", 184, 8, "F2", "0.09 0.20 0.30"),
    textCommand("DATE ISSUED", 104, 139, 7, "F2", "0.17 0.50 0.50"),
    textCommand(date, 104, 121, 10, "F1", "0.09 0.20 0.30"),
    textCommand("AUTHENTICITY REFERENCE", 558, 139, 7, "F2", "0.17 0.50 0.50"),
    textCommand(certificateNumber, 558, 121, 9, "F2", "0.09 0.20 0.30"),
    line(104, 101, 275, 101, "0.09 0.20 0.30", 0.8),
    line(558, 101, 729, 101, "0.09 0.20 0.30", 0.8),
    centeredText("ACADEMY AUTHORISATION", 86, 7, "F1", "0.35 0.38 0.39"),
    centeredText("Verify this credential at kpxacademy.com.ng using the authenticity reference above.", 61, 7.5, "F1", "0.25 0.29 0.31"),
  ].join("");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
};

export const uploadCertificateDocument = async (buffer, certificateNumber) => {
  const publicId = `certificate-${certificateNumber}-${randomUUID()}`;
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "kpx/certificates",
        public_id: publicId,
        resource_type: "raw",
        type: "authenticated",
        format: "pdf",
      },
      (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
    );
    stream.end(buffer);
  });
  return { url: result.secure_url, publicId: result.public_id };
};

export const uploadProofFile = async (file) => {
  const resourceType = file.mimetype === "application/pdf" ? "raw" : "image";
  const publicId = `proof-${randomUUID()}`;
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "kpx/certificate-proofs",
        public_id: publicId,
        resource_type: resourceType,
        type: "authenticated",
        ...(resourceType === "raw" ? { format: "pdf" } : {}),
      },
      (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
    );
    stream.end(file.buffer);
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType,
  };
};

export const getProofAccessUrl = (submission) => {
  const resourceType = submission.proofMimeType === "application/pdf" ? "raw" : "image";
  return cloudinary.url(submission.proofPublicId, {
    resource_type: resourceType,
    type: "authenticated",
    sign_url: true,
    secure: true,
  });
};
