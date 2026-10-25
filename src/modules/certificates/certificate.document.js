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
  `BT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${pdfText(text)}) Tj ET\n`;

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

const circle = (x, y, radius, color, stroke = false, lineWidth = 1) => {
  const k = radius * 0.5523;
  const path = [
    `${x - radius} ${y} m`,
    `${x - radius} ${y + k} ${x - k} ${y + radius} ${x} ${y + radius} c`,
    `${x + k} ${y + radius} ${x + radius} ${y + k} ${x + radius} ${y} c`,
    `${x + radius} ${y - k} ${x + k} ${y - radius} ${x} ${y - radius} c`,
    `${x - k} ${y - radius} ${x - radius} ${y - k} ${x - radius} ${y} c h`,
  ].join(" ");
  return `q ${color} ${stroke ? "RG" : "rg"} ${lineWidth} w ${path} ${stroke ? "S" : "f"} Q `;
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const polygon = (points, color, stroke = false, lineWidth = 1) => {
  const [first, ...rest] = points;
  const path = [
    `${first[0]} ${first[1]} m`,
    ...rest.map(([x, y]) => `${x} ${y} l`),
    "h",
  ].join(" ");
  return `q ${color} ${stroke ? "RG" : "rg"} ${lineWidth} w ${path} ${stroke ? "S" : "f"} Q\n`;
};

const starburst = (cx, cy, outerRadius, innerRadius, points, color) => {
  const vertices = [];
  for (let i = 0; i < points * 2; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * i) / points;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push([
      Number((cx + Math.cos(angle) * radius).toFixed(2)),
      Number((cy + Math.sin(angle) * radius).toFixed(2)),
    ]);
  }
  return polygon(vertices, color);
};

export const createCertificatePdf = ({
  studentName,
  trainingProgramTitle,
  certificateNumber,
  issuedAt,
}) => {
  const name = String(studentName ?? "").trim();
  const programme = String(trainingProgramTitle ?? "").trim().toUpperCase();
  const date = formatDate(issuedAt);
  const nameSize = Math.min(30, Math.max(17, 30 - Math.max(0, name.length - 24) * 0.45));
  const programmeSize = Math.min(21, Math.max(12, 21 - Math.max(0, programme.length - 30) * 0.28));

  const content = [
    // KPX Academy palette: warm ivory, navy, teal, and restrained muted gold.
    rectangle(0, 0, 842, 595, "0.97 0.96 0.94"),
    rectangle(0, 0, 92, 595, "0.09 0.20 0.30"),
    rectangle(80, 0, 14, 595, "0.16 0.50 0.50"),
    rectangle(87, 0, 3, 595, "0.83 0.66 0.35"),
    rectangle(94, 0, 3, 595, "0.16 0.50 0.50"),

    // Navy right panel with teal and gold accents; no harsh black wedge.
    polygon([[690, 595], [842, 595], [842, 0], [744, 0], [685, 210], [735, 280], [690, 355]], "0.09 0.20 0.30"),
    polygon([[718, 595], [744, 595], [842, 300], [842, 238], [763, 410]], "0.16 0.50 0.50"),
    polygon([[754, 595], [771, 595], [842, 415], [842, 374]], "0.83 0.66 0.35"),
    polygon([[785, 595], [842, 595], [842, 520]], "0.09 0.20 0.30"),

    // Award ribbon and gold rosette.
    rectangle(39, 479, 20, 116, "0.16 0.50 0.50"),
    rectangle(47, 479, 4, 116, "0.83 0.66 0.35"),
    polygon([[39, 510], [26, 486], [43, 491], [49, 470], [59, 492], [76, 486], [59, 511]], "0.16 0.50 0.50"),
    starburst(49, 510, 49, 43, 20, "0.09 0.20 0.30"),
    circle(49, 510, 37, "0.83 0.66 0.35"),
    circle(49, 510, 31, "0.93 0.77 0.40"),
    circle(49, 510, 26, "0.83 0.66 0.35"),
    circle(49, 510, 22, "0.97 0.87 0.62", true, 1.2),

    // Wordmark plaque, aligned to the title block.
    rectangle(540, 465, 145, 68, "1 1 1"),
    rectangle(540, 465, 145, 68, "0.16 0.50 0.50", true, 1),
    textCommand("KPX", 572, 493, 25, "F2", "0.09 0.20 0.30"),
    textCommand("A C A D E M Y", 550, 476, 8, "F1", "0.16 0.50 0.50"),

    // Main hierarchy.
    textCommand("CERTIFICATE", 186, 493, 39, "F2", "0.09 0.20 0.30"),
    textCommand("OF COMPLETION", 186, 461, 18, "F2", "0.16 0.50 0.50"),
    textCommand("This certificate is proudly presented to:", 186, 434, 11, "F1", "0.25 0.25 0.25"),
    textCommand(name, 186, 383, nameSize, "F3", "0.09 0.20 0.30"),
    line(186, 373, 615, 373, "0.83 0.66 0.35", 1),
    circle(186, 373, 1.7, "0.83 0.66 0.35"),
    circle(615, 373, 1.7, "0.83 0.66 0.35"),

    textCommand("for successfully completing the", 186, 349, 11, "F1", "0.25 0.25 0.25"),
    textCommand(programme, 186, 319, programmeSize, "F2", "0.09 0.20 0.30"),

    // Readable achievement statement.
    textCommand("In recognition of the foundational knowledge and practical skills", 186, 288, 9, "F1", "0.25 0.25 0.25"),
    textCommand("demonstrated in the programme, including an understanding of its", 186, 273, 9, "F1", "0.25 0.25 0.25"),
    textCommand("materials, tools, and techniques. Following successful review and", 186, 258, 9, "F1", "0.25 0.25 0.25"),
    textCommand("approval of the required practical work, the recipient has met", 186, 243, 9, "F1", "0.25 0.25 0.25"),
    textCommand("KPX Academy requirements for certification.", 186, 228, 9, "F1", "0.25 0.25 0.25"),

    // Genuine signatures can be supplied later; do not fabricate handwriting.
    textCommand("Authorised by", 186, 169, 8, "F1", "0.16 0.50 0.50"),
    line(186, 151, 340, 151, "0.09 0.20 0.30", 0.8),
    textCommand("Kepemi Oluwafunke (Keplex)", 186, 132, 10, "F2", "0.09 0.20 0.30"),
    textCommand("Founder, KPX Academy", 186, 113, 9, "F1", "0.25 0.25 0.25"),

    textCommand("Date of issue", 545, 169, 8, "F1", "0.16 0.50 0.50"),
    line(545, 151, 660, 151, "0.09 0.20 0.30", 0.8),
    textCommand(date, 545, 132, 10, "F2", "0.09 0.20 0.30"),

    textCommand("Certificate ID: " + certificateNumber, 105, 66, 10, "F3", "0.09 0.20 0.30"),
    textCommand("kpxacademy.com.ng", 575, 66, 9, "F3", "0.09 0.20 0.30"),
    textCommand("PRACTICAL SKILLS. MORE POSSIBILITIES.", 575, 26, 7, "F1", "0.16 0.50 0.50"),
  ].join("");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
    "<< /Length " + Buffer.byteLength(content, "ascii") + " >>\nstream\n" + content + "endstream",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += String(offset).padStart(10, "0") + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
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
