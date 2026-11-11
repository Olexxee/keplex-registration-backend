import assert from "node:assert/strict";
import test from "node:test";

process.env.CLOUDINARY_CLOUD_NAME ||= "certificate-test";
process.env.CLOUDINARY_API_KEY ||= "123456789012345";
process.env.CLOUDINARY_API_SECRET ||= "certificate-test-secret";
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/certificate_test";

const {
  downloadCertificateDocument,
  getCertificateDocumentAccessUrl,
} = await import("./certificate.document.js");

const pdf = Buffer.from("%PDF-1.7\nmock certificate\n%%EOF");

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

test("falls back to the signed raw URL when the original stored URL returns 404", async (t) => {
  const originalFetch = globalThis.fetch;
  const storedUrl = "https://res.cloudinary.com/demo/raw/authenticated/s--signature--/v123/kpx/certificates/certificate-1.pdf";
  const fallbackUrl = getCertificateDocumentAccessUrl({
    documentPublicId: "kpx/certificates/certificate-1.pdf",
  });
  const requested = [];

  globalThis.fetch = async (url) => {
    requested.push(String(url));
    if (String(url) === storedUrl) return new Response("Not found", { status: 404 });
    if (String(url) === fallbackUrl) return new Response(pdf, {
      status: 200,
      headers: { "content-type": "application/pdf" },
    });
    return new Response("Unexpected URL", { status: 500 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await downloadCertificateDocument({
    documentUrl: storedUrl,
    documentPublicId: "kpx/certificates/certificate-1.pdf",
  });

  assert.deepEqual(result, pdf);
  assert.deepEqual(requested, [storedUrl, fallbackUrl]);
});
