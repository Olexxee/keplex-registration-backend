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

const textCommand = (text, x, y, size, font = "F1") =>
  `BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET\n`;

export const createCertificatePdf = ({ studentName, trainingProgramTitle, certificateNumber, issuedAt }) => {
  const date = new Date(issuedAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
  });
  const content = [
    "q 0.12 0.20 0.42 RG 5 w 25 25 792 545 re S Q\n",
    "q 0.70 0.18 0.40 RG 1.5 w 38 38 766 519 re S Q\n",
    textCommand("KPX ACADEMY", 330, 505, 15, "F2"),
    textCommand("CERTIFICATE OF COMPLETION", 215, 430, 23, "F2"),
    textCommand("This certificate is proudly presented to", 295, 375, 12),
    textCommand(studentName, Math.max(80, 421 - (studentName.length * 7)), 325, 25, "F2"),
    textCommand("for successfully completing the training programme", 260, 278, 12),
    textCommand(trainingProgramTitle, Math.max(70, 421 - (trainingProgramTitle.length * 4)), 245, 17, "F2"),
    textCommand(`Date issued: ${date}`, 95, 115, 10),
    textCommand(`Certificate No: ${certificateNumber}`, 95, 92, 10),
    textCommand("Verify this certificate using its certificate number on the KPX Academy website.", 95, 62, 9),
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
