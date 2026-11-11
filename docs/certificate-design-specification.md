# KPX Academy Certificate Design Specification

Status: CERT-03 reference composition and protected signature integration implemented; awaiting CI and live visual acceptance
Canvas: A4 landscape, 297 × 210 mm (842 × 595 SVG viewBox)
Reference: user-supplied A4 landscape completion certificate PDF (new visual master)

## Design objective

Match the latest supplied KPX completion certificate reference. This reference supersedes the earlier teal/gold rosette concept. The design uses a white page, inset charcoal border, pink top-left logo banner, blue heading and rule, magenta programme title, and blue/magenta/grey wave artwork at the top-right and bottom-left. The certificate is a backend-owned, data-driven PDF. The frontend only provides the public verification experience; it does not design, position, or render certificate artwork.

## Brand palette

| Token | Hex | Intended use |
|---|---|---|
| Blue | #2455E8 | Main certificate heading and divider rule |
| Magenta | #9B2163 | Programme title and restrained accent artwork |
| White | #FFFFFF | Main certificate paper field |
| Pale pink | #F6DCE7 | Top-left logo banner |
| Charcoal | #25292D | Inset page border and signature/date rules |

The wave artwork uses restrained tonal variations of blue, magenta and grey from the supplied reference. These are reference-specific certificate colours, not a replacement for the academy's wider site palette.

## Composition and geometry

- A4 landscape canvas, 842 × 595 SVG viewBox.
- White page with a fine charcoal rectangular border inset from the page edges.
- Pale-pink vertical banner at the upper-left containing the official KPX Academy logo.
- Large centered blue CERTIFICATE heading and black OF COMPLETION subtitle.
- Centered recipient introduction and dynamic recipient name, followed by a blue horizontal rule.
- Magenta serif programme title with centered completion and achievement copy.
- Founder signature image above the printed founder name and designation in the lower-left.
- QR code and "Scan to Verify" label in the lower-centre.
- Issue date and rule in the lower-right.
- Certificate identifier and verification URL in the footer.
- Layered blue, magenta and grey wave artwork at the top-right and bottom-left.

## Dynamic content

The backend renderer supplies the following per-certificate content independently of the decorative artwork:

1. CERTIFICATE heading and OF COMPLETION subtitle.
2. Introductory and achievement copy.
3. Student full name.
4. Training programme title.
5. Issue date and certificate number.
6. QR code and public verification URL.
7. Approved founder signature image, printed founder name and title.

Student names, programme titles, certificate numbers, issue dates and QR codes are not baked into the decorative SVG. The handwritten founder signature is loaded only from the protected `CERTIFICATE_SIGNATURE_BASE64` runtime secret. It is embedded into the PDF during backend rendering and is not stored in the repository or exposed by an API.

## Typography direction

- Headings: Sora (bold / extra-bold).
- Supporting sans-serif text: Inter.
- Recipient name and certificate number: Cormorant Garamond or a similarly legible serif.

Current implementation declares these font families but does not bundle or embed their font files. Rendering therefore depends on the fonts available to Cloudinary's rendering pipeline and its fallbacks. Bundled font embedding and measured text fitting remain follow-up work if the live output shows fallback or clipping issues.

## Gradient and depth treatment

- Medal: multi-stop metallic gold linear/radial gradients with controlled highlights and darker edge tones.
- Ribbon: teal linear gradient with darker edge shading and a gold pinstripe.
- Right panel: deep navy multi-stop gradient; layered teal edge bevels and low-opacity highlights.
- Logo plaque: white-to-warm-white gradient and restrained soft shadow.
- Paper: near-white/warm-ivory tonal gradient with barely visible texture.
- Avoid heavy shadows, glossy plastic effects, excessive gold, and pure-black geometry.

## Implementation

- Decorative artwork: `assets/certificates/kpx-certificate-artwork.svg`.
- The signature PNG is held as a protected Render environment secret (`CERTIFICATE_SIGNATURE_BASE64`); it is never committed to source control.
- Dynamic SVG composition, official Site Branding logo retrieval, QR generation, Cloudinary rendering and PDF creation: `src/modules/certificates/certificate.document.js`.
- QR generation uses the vendored MIT-licensed implementation at `src/lib/vendor/qrcode-generator.mjs`; its license is included alongside it.
- The backend uploads a temporary authenticated SVG render asset, requests a 3508 × 2480 JPEG transformation (approximately 300 DPI), wraps the resulting image in a single-page A4 landscape PDF, and deletes the temporary SVG.
- Final PDFs continue through the existing authenticated Cloudinary raw-file storage and certificate issuance flow.
- Resends download and send the originally stored PDF; they do not regenerate it.
- The frontend certificate page reads the `number` query parameter, prefills the verification field and automatically calls the public verification endpoint. The QR destination is `FRONTEND_URL/certificates?number=<certificate-number>#verify-certificate`.

## Known limitations and live acceptance

The code is committed, but a successful live render has not yet been demonstrated. Do not treat visual fidelity as accepted until a real certificate has been issued and inspected.

The current PDF is a high-resolution raster page, not a vector/text-selectable PDF. Font binaries are not embedded. The signature is required at render time; issuance fails closed when the protected signature secret is missing or invalid. Cloudinary authenticated SVG upload, transformation permissions, generated PDF validity and final visual matching still require live verification.

When testing, verify:

- [ ] A certificate can be issued through the deployed backend.
- [ ] The official Site Branding logo loads; fallback behavior is acceptable if it does not.
- [ ] Cloudinary accepts the authenticated temporary SVG and returns the expected 3508 × 2480 JPEG.
- [ ] The final document opens as a single-page A4 landscape PDF.
- [ ] Student name and long programme titles do not clip, overlap or become unreadable.
- [ ] QR code scans reliably and opens the frontend certificate page with the number prefilled and automatically verified.
- [ ] The public verification result shows the correct recipient, programme, issue date and validity state.
- [ ] The certificate email attachment matches the stored PDF.
- [ ] Resending delivers the exact same stored PDF rather than regenerating it.
- [ ] Temporary render assets are deleted after both successful and failed render attempts.
- [ ] Printed output is visually compared against the latest supplied reference before claiming the target visual match.
- [ ] Founder signature is present and crisp; the original secret is not present in the repository, logs, API responses or public URLs.

## Operational dependencies

The backend requires valid Cloudinary credentials and permission to upload authenticated image assets, transform them, and delete temporary assets. The logo is read from the existing Site Branding record and must be hosted on the allowed Cloudinary domain. The configured `FRONTEND_URL` should point to the deployed KPX Academy site.

Do not change the existing certificate API, persistence model, authenticated storage workflow or issuance semantics as part of visual tuning unless separately reviewed.
