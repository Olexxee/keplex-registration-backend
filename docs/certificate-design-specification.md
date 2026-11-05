# KPX Academy Certificate Design Specification

Status: CERT-02 implementation committed; awaiting live rendering and visual acceptance
Canvas: A4 landscape, 297 × 210 mm (842 × 595 SVG viewBox)
Reference: user-supplied certificate image (1536 × 1086 px)

## Design objective

Recreate the reference certificate's composition and visual hierarchy while adapting its palette to KPX Academy. The certificate is a backend-owned, data-driven PDF. The frontend only provides the public verification experience; it does not design, position, or render certificate artwork.

## Brand palette

| Token | Hex | Intended use |
|---|---|---|
| Navy | #17324D | Main heading, right-side geometric panel, primary text |
| Teal | #2A7F7F | Left ribbon, subtitle, decorative highlights |
| Warm ivory | #F7F5F0 | Paper field |
| Blush | #F3D7CC | Optional restrained accent only; not dominant |
| Gold | #D4A85A | Medal, ribbon pinstripe, fine decorative rules |

The artwork uses darker/lighter derived shades of the approved navy, teal and gold tokens to create depth. These are tonal variations, not new brand colours.

## Composition and geometry

- Landscape A4 canvas with an 842 × 595 viewBox.
- Warm ivory paper field with extremely subtle grain.
- Full-height left vertical teal ribbon with a narrow gold centre stripe.
- Layered award rosette near the upper-left corner: serrated teal outer edge, metallic gold rim, warm gold face and restrained highlight.
- Right-side angular navy panel occupying approximately the final 20% of the page, with layered teal bevels and fine gold/teal highlights.
- Raised white logo plaque in the upper-right content area, populated at render time from the existing Site Branding logo URL. A text wordmark is used only as a fallback when the official logo cannot be retrieved.

## Dynamic content

The backend renderer supplies the following per-certificate content independently of the decorative artwork:

1. CERTIFICATE heading and OF COMPLETION subtitle.
2. Introductory and achievement copy.
3. Student full name.
4. Training programme title.
5. Issue date and certificate number.
6. QR code and public verification URL.
7. Signature line and founder title.

Student names, programme titles, certificate numbers, issue dates and QR codes are not baked into the decorative SVG. No handwritten signature is fabricated; the signature line remains blank until an approved signature asset or signature text is supplied.

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
- Dynamic SVG composition, official Site Branding logo retrieval, QR generation, Cloudinary rendering and PDF creation: `src/modules/certificates/certificate.document.js`.
- QR generation uses the vendored MIT-licensed implementation at `src/lib/vendor/qrcode-generator.mjs`; its license is included alongside it.
- The backend uploads a temporary authenticated SVG render asset, requests a 3508 × 2480 JPEG transformation (approximately 300 DPI), wraps the resulting image in a single-page A4 landscape PDF, and deletes the temporary SVG.
- Final PDFs continue through the existing authenticated Cloudinary raw-file storage and certificate issuance flow.
- Resends download and send the originally stored PDF; they do not regenerate it.
- The frontend certificate page reads the `number` query parameter, prefills the verification field and automatically calls the public verification endpoint. The QR destination is `FRONTEND_URL/certificates?number=<certificate-number>#verify-certificate`.

## Known limitations and live acceptance

The code is committed, but a successful live render has not yet been demonstrated. Do not treat visual fidelity as accepted until a real certificate has been issued and inspected.

The current PDF is a high-resolution raster page, not a vector/text-selectable PDF. Font binaries are not embedded. The signature line is intentionally blank pending an approved asset. Cloudinary authenticated SVG upload, transformation permissions, generated PDF validity and final visual matching still require live verification.

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
- [ ] Printed output is visually compared against the supplied reference before claiming the target visual match.

## Operational dependencies

The backend requires valid Cloudinary credentials and permission to upload authenticated image assets, transform them, and delete temporary assets. The logo is read from the existing Site Branding record and must be hosted on the allowed Cloudinary domain. The configured `FRONTEND_URL` should point to the deployed KPX Academy site.

Do not change the existing certificate API, persistence model, authenticated storage workflow or issuance semantics as part of visual tuning unless separately reviewed.
