import assert from "node:assert/strict";
import test from "node:test";

process.env.CLOUDINARY_CLOUD_NAME ||= "certificate-test";
process.env.CLOUDINARY_API_KEY ||= "123456789012345";
process.env.CLOUDINARY_API_SECRET ||= "certificate-test-secret";
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/certificate_test";

const {
  CERTIFICATE_TEMPLATE_VERSION,
  createCertificateSvg,
  downloadCertificateDocument,
  getCertificateDocumentAccessUrl,
  isCertificateDocumentCurrent,
} = await import("./certificate.document.js");

const pdf = Buffer.from("%PDF-1.7\nmock certificate\n%%EOF");

test("identifies legacy certificate PDFs for regeneration before delivery", () => {
  assert.equal(CERTIFICATE_TEMPLATE_VERSION, "2026-11-reference-v1");
  assert.equal(isCertificateDocumentCurrent({ documentTemplateVersion: "legacy" }), false);
  assert.equal(isCertificateDocumentCurrent({ documentTemplateVersion: CERTIFICATE_TEMPLATE_VERSION }), true);
});


test("renders the approved certificate artwork with the recipient's preserved identity", async () => {
  const signatureDataUri = "data:image/png;base64,dGVzdC1zaWduYXR1cmU=";
  const svg = await createCertificateSvg({
    studentName: "Legacy Student",
    trainingProgramTitle: "KPX Resin Art Training",
    certificateNumber: "KPX-2026-LEGACY01",
    issuedAt: new Date("2026-10-01T00:00:00.000Z"),
    signatureDataUri,
  });

  assert.match(svg, /KPX Academy Certificate of Completion/);
  assert.match(svg, /Legacy Student/);
  assert.match(svg, /KPX RESIN ART TRAINING/);
  assert.match(svg, /KPX-2026-LEGACY01/);
  assert.match(svg, /01 October 2026/);
  assert.match(svg, /data:image\/png;base64,dGVzdC1zaWduYXR1cmU=/);
  assert.match(svg, /#9B4D79/);
  assert.match(svg, /#2455E8/);
  assert.match(svg, /Scan to Verify/);
});

test("uses the exact authenticated Cloudinary URL saved at upload time", () => {
  const storedUrl = "https://res.cloudinary.com/demo/raw/authenticated/s--signature--/v123/kpx/certificates/certificate-1.pdf";
  assert.equal(
    getCertificateDocumentAccessUrl({
      documentUrl: storedUrl,
      documentPublicId: "kpx/certificates/certificate-1.pdf",
    }),
    storedUrl,
  );
});

test("builds a signed raw URL without appending a duplicate PDF extension", () => {
  const url = getCertificateDocumentAccessUrl({
    documentPublicId: "kpx/certificates/certificate-1.pdf",
  });
  assert.match(url, /^https:\/\/res\.cloudinary\.com\/certificate-test\/raw\/authenticated\//);
  const parsed = new URL(url);
  assert.match(parsed.pathname, /\/kpx\/certificates\/certificate-1\.pdf$/);
  assert.doesNotMatch(parsed.pathname, /\.pdf\.pdf$/);
});

test("rejects an untrusted stored URL and uses the signed Cloudinary URL", () => {
  const url = getCertificateDocumentAccessUrl({
    documentUrl: "https://example.invalid/certificate.pdf",
    documentPublicId: "kpx/certificates/certificate-1.pdf",
  });
  assert.match(url, /^https:\/\/res\.cloudinary\.com\//);
  assert.doesNotMatch(url, /example\.invalid/);
});

test("fallback URL preserves the exact Cloudinary version from the stored PDF URL", async (t) => {
  const originalFetch = globalThis.fetch;
  const storedUrl = "https://res.cloudinary.com/demo/raw/authenticated/s--signature--/v1794323075/kpx/certificates/certificate-1.pdf";
  const requested = [];

  globalThis.fetch = async (url) => {
    requested.push(String(url));
    if (String(url) === storedUrl) return new Response("Not found", { status: 404 });
    const fallback = new URL(String(url));
    assert.ok(fallback.pathname.split("/").includes("v1794323075"), `Fallback URL omitted stored version: ${fallback.pathname}`);
    assert.ok(fallback.pathname.includes("/raw/authenticated/"));
    assert.ok(fallback.pathname.endsWith("/kpx/certificates/certificate-1.pdf"));
    return new Response(pdf, {
      status: 200,
      headers: { "content-type": "application/pdf" },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await downloadCertificateDocument({
    documentUrl: storedUrl,
    documentPublicId: "kpx/certificates/certificate-1.pdf",
  });

  assert.deepEqual(result, pdf);
  assert.equal(requested.length, 2);
  assert.equal(requested[0], storedUrl);
  assert.ok(new URL(requested[1]).pathname.split("/").includes("v1794323075"));
});
