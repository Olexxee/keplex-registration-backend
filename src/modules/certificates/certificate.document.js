import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { cloudinary } from "../../config/cloudinary.js";
import { getSiteBranding } from "../siteContent/siteContent.service.js";
import qrcode from "../../lib/vendor/qrcode-generator.mjs";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const RENDER_WIDTH = 3508;
const RENDER_HEIGHT = 2480;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const escapeXml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]);

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const getVerificationUrl = (certificateNumber) => {
  const frontendUrl = process.env.FRONTEND_URL || "https://kpxacademy.com.ng";
  const url = new URL("/certificates", frontendUrl);
  url.searchParams.set("number", certificateNumber);
  url.hash = "verify-certificate";
  return url.toString();
};

const fetchLogoDataUri = async (logoUrl) => {
  if (!logoUrl) return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(logoUrl);
  } catch {
    console.warn("[certificates] Ignoring invalid academy logo URL.");
    return null;
  }

  // The logo is managed by the academy's Cloudinary upload workflow.
  // Restrict the outbound request to Cloudinary to prevent SSRF through edited branding.
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "res.cloudinary.com") {
    console.warn("[certificates] Ignoring academy logo outside the configured Cloudinary host.");
    return null;
  }

  try {
    const response = await fetch(parsedUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Logo request failed with status ${response.status}`);

    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
    if (!allowedTypes.has(contentType)) throw new Error("Unsupported academy logo image format.");

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_LOGO_BYTES) throw new Error("Academy logo must be smaller than 5 MB.");

    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch (error) {
    console.error("[certificates] Could not load the academy logo; using the text fallback:", error);
    return null;
  }
};

const createQrMarkup = (value) => {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 5, margin: 4, scalable: true, title: "Verify this KPX Academy certificate" });
  const match = svg.match(/^<svg[^>]*>([\s\S]*)<\/svg>$/);
  const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!match || !viewBox) throw new Error("Could not generate the certificate verification QR code.");
  const markup = match[1].replace(/<rect width="100%" height="100%" fill="white"[^>]*\/>/, "");
  return { markup, size: Number(viewBox[1]) };
};

const loadArtwork = async () => {
  const artworkUrl = new URL("../../../assets/certificates/kpx-certificate-artwork.svg", import.meta.url);
  return readFile(artworkUrl, "utf8");
};

const fetchFounderSignatureDataUri = () => {
  const encoded = process.env.CERTIFICATE_SIGNATURE_BASE64?.trim();
  if (!encoded) throw new Error("CERTIFICATE_SIGNATURE_BASE64 is required before issuing certificates.");
  const bytes = Buffer.from(encoded, "base64");
  const magic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 100 || !bytes.subarray(0, 8).equals(magic)) throw new Error("CERTIFICATE_SIGNATURE_BASE64 must contain a valid PNG image.");
  if (bytes.length > 2 * 1024 * 1024) throw new Error("The founder signature image must not exceed 2 MB.");
  return "data:image/png;base64," + bytes.toString("base64");
};
export const createCertificateSvg = async ({
  studentName,
  trainingProgramTitle,
  certificateNumber,
  issuedAt,
  logoDataUri = null,
  signatureDataUri,
  artwork,
}) => {
  const name = String(studentName ?? "").trim();
  const programme = String(trainingProgramTitle ?? "").trim();
  if (!name || !programme || !certificateNumber || !issuedAt) {
    throw new Error("Student name, programme, certificate number, and issue date are required to render a certificate.");
  }

  if (!signatureDataUri) throw new Error("The approved founder signature is required to render a certificate.");
  const sourceArtwork = artwork ?? await loadArtwork();
  const artworkBody = sourceArtwork.replace(/^\s*<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
  const date = formatDate(issuedAt);
  const verificationUrl = getVerificationUrl(certificateNumber);
  const qr = createQrMarkup(verificationUrl);
  const qrScale = 60 / qr.size;
  const safeName = escapeXml(name);
  const safeProgramme = escapeXml(programme.toUpperCase());
  const safeCertificateNumber = escapeXml(certificateNumber);
  const nameSize = Math.min(42, Math.max(25, 42 - Math.max(0, [...name].length - 22) * 0.65));
  const programmeSize = Math.min(27, Math.max(17, 27 - Math.max(0, [...programme].length - 28) * 0.32));
  const logoMarkup = logoDataUri
    ? `<image href="${logoDataUri}" xlink:href="${logoDataUri}" x="77" y="12" width="130" height="83" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="142" y="58" text-anchor="middle" font-family="Sora, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2" fill="#17324D">KPX</text><text x="142" y="76" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="10" letter-spacing="5" fill="#2A7F7F">ACADEMY</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${RENDER_WIDTH}" height="${RENDER_HEIGHT}" viewBox="0 0 842 595">
  <title>KPX Academy Certificate of Completion — ${safeName}</title>
  <desc>Official KPX Academy certificate for ${safeName}, awarded for completing ${safeProgramme}.</desc>
  ${artworkBody}
  ${logoMarkup}
  <image href="${signatureDataUri}" xlink:href="${signatureDataUri}" x="211" y="452" width="105" height="35" preserveAspectRatio="xMidYMid meet"/>
  <g text-anchor="middle"><text x="421" y="137" font-family="Sora, Arial, sans-serif" font-size="49" font-weight="800" letter-spacing="1.5" fill="#2455E8">CERTIFICATE</text><text x="421" y="169" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800" fill="#111111">OF COMPLETION</text></g>
  <text x="421" y="202" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" fill="#111111">This certificate is proudly presented to</text>
  <text x="421" y="274" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="${nameSize}" fill="#202020" textLength="560" lengthAdjust="spacingAndGlyphs">${safeName}</text>
  <path d="M126 287 H716" stroke="#2455E8" stroke-width="1.5" fill="none"/>
  <text x="421" y="313" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="14" fill="#55524E">for successfully completing the</text>
  <text x="421" y="348" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="${programmeSize}" font-weight="700" fill="#9B2163" textLength="570" lengthAdjust="spacingAndGlyphs">${safeProgramme}</text>
  <g text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="13" fill="#4C4C4C">
    <text x="421" y="378">In recognition of the foundational knowledge and practical skills demonstrated in</text>
    <text x="421" y="395">the training programme, including an understanding of its materials, tools and</text>
    <text x="421" y="412">techniques. Following successful review and approval of the required practical</text>
    <text x="421" y="429">work, the recipient has met KPX Academy's requirements for certification.</text>
  </g>
  <g fill="#17324D">
    <path d="M211 494 H357 M596 494 H742" stroke="#252525" stroke-width="1.1"/>
    <circle cx="211" cy="494" r="1.8" fill="#252525"/><circle cx="357" cy="494" r="1.8" fill="#252525"/>
    <circle cx="596" cy="494" r="1.8" fill="#252525"/><circle cx="742" cy="494" r="1.8" fill="#252525"/>
    <text x="284" y="510" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700">Kepemi Oluwafunke (Keplex)</text>
    <text x="284" y="527" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="12" fill="#55524E">Founder, KPX Academy</text>
    <text x="669" y="510" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700">Date of issue</text>
    <text x="669" y="527" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="12" fill="#55524E">${escapeXml(date)}</text>
  </g>
  <g transform="translate(417 459) scale(${qrScale})">
    ${qr.markup}
  </g>
  <text x="447" y="535" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="10" font-style="italic" fill="#55524E">Scan to Verify</text>
  <text x="535" y="548" font-family="Georgia, 'Times New Roman', serif" font-size="14" font-style="italic" fill="#55524E">Certificate ID: ${safeCertificateNumber}</text>
  <text x="390" y="580" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="14" font-style="italic" fill="#55524E">kpxacademy.com.ng/certificates</text>
  <text x="690" y="565" text-anchor="middle" font-family="cursive" font-size="13" font-style="italic" fill="#5CA39A">Practical Skills.</text>
  <text x="690" y="580" text-anchor="middle" font-family="cursive" font-size="13" font-style="italic" fill="#5CA39A">More Possibilities.</text>
</svg>`;
};

const uploadSvgForRendering = (svg) => new Promise((resolve, reject) => {
  const publicId = `certificate-render-${randomUUID()}`;
  const stream = cloudinary.uploader.upload_stream({
    folder: "kpx/certificate-renders",
    public_id: publicId,
    resource_type: "image",
    type: "authenticated",
    format: "svg",
    overwrite: false,
  }, (error, uploaded) => {
    if (error) return reject(error);
    if (!uploaded?.public_id) return reject(new Error("Cloudinary did not return the temporary certificate artwork asset."));
    resolve({ publicId: uploaded.public_id });
  });
  stream.end(Buffer.from(svg, "utf8"));
});

const renderSvgToJpeg = async (svg) => {
  const temporaryAsset = await uploadSvgForRendering(svg);
  try {
    const renderUrl = cloudinary.url(temporaryAsset.publicId, {
      resource_type: "image",
      type: "authenticated",
      sign_url: true,
      secure: true,
      format: "jpg",
      transformation: [{ width: RENDER_WIDTH, height: RENDER_HEIGHT, crop: "fill", quality: "100" }],
    });
    const response = await fetch(renderUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      throw new Error(`Certificate artwork rendering failed (${response.status}). Check Cloudinary authenticated image transformation permissions.`);
    }
    const jpeg = Buffer.from(await response.arrayBuffer());
    if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8 || jpeg[2] !== 0xff) {
      throw new Error("Cloudinary returned an invalid JPEG for certificate rendering.");
    }
    return jpeg;
  } finally {
    await cloudinary.uploader.destroy(temporaryAsset.publicId, {
      resource_type: "image",
      type: "authenticated",
    }).catch((error) => console.error("[certificates] Could not remove temporary artwork:", error));
  }
};

export const wrapJpegInPdf = (jpeg) => {
  if (!Buffer.isBuffer(jpeg) || jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
    throw new Error("A valid JPEG image is required to create the certificate PDF.");
  }

  const content = Buffer.from(
    `q\n${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm\n/Im0 Do\nQ\n`,
    "ascii",
  );
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "ascii"),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`, "ascii"),
    Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${RENDER_WIDTH} /Height ${RENDER_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, "ascii"),
      jpeg,
      Buffer.from("\nendstream", "ascii"),
    ]),
    Buffer.concat([
      Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "ascii"),
      content,
      Buffer.from("endstream", "ascii"),
    ]),
  ];

  const chunks = [Buffer.from("%PDF-1.4\n", "ascii")];
  const offsets = [0];
  let byteLength = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(byteLength);
    const chunk = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, "ascii"),
      object,
      Buffer.from("\nendobj\n", "ascii"),
    ]);
    chunks.push(chunk);
    byteLength += chunk.length;
  });

  const xrefOffset = byteLength;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Buffer.from(xref, "ascii"));
  return Buffer.concat(chunks);
};

export const createCertificatePdf = async (certificate) => {
  const branding = await getSiteBranding();
  const logoDataUri = await fetchLogoDataUri(branding?.logoUrl);
  const signatureDataUri = fetchFounderSignatureDataUri();
  const svg = await createCertificateSvg({ ...certificate, logoDataUri, signatureDataUri });
  const jpeg = await renderSvgToJpeg(svg);
  return wrapJpegInPdf(jpeg);
};

const getTrustedStoredCertificateUrl = (documentUrl) => {
  if (!documentUrl) return null;
  try {
    const parsed = new URL(documentUrl);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "res.cloudinary.com" ||
      !parsed.pathname.includes("/raw/authenticated/")
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const getSignedCertificateUrl = (documentPublicId) => {
  if (!documentPublicId) return null;
  // Cloudinary raw public IDs include the file extension. Do not pass format:
  // doing so can produce a second extension and a URL that returns 404.
  return cloudinary.url(documentPublicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
  });
};

export const getCertificateDocumentAccessUrl = (certificate) =>
  getTrustedStoredCertificateUrl(certificate.documentUrl) ||
  getSignedCertificateUrl(certificate.documentPublicId);

export const downloadCertificateDocument = async (certificate) => {
  const urls = [
    getTrustedStoredCertificateUrl(certificate?.documentUrl),
    getSignedCertificateUrl(certificate?.documentPublicId),
  ].filter((url, index, all) => url && all.indexOf(url) === index);

  if (!urls.length) throw new Error("Certificate document is not available for resend.");

  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        lastError = new Error(`Could not retrieve the stored certificate PDF (${response.status}).`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
        lastError = new Error("The stored certificate document is not a valid PDF.");
        continue;
      }
      return buffer;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Could not retrieve the stored certificate PDF.");
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
