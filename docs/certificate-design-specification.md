# KPX Academy Certificate Design Specification

Status: CERT-01 visual specification and decorative artwork  
Canvas: A4 landscape, 297 × 210 mm (842 × 595 SVG viewBox)  
Reference: user-supplied certificate image (1536 × 1086 px)

## Design objective

Recreate the reference certificate's composition and visual hierarchy while adapting its palette to KPX Academy. The certificate remains a backend-owned, data-driven PDF. This phase defines the artwork and layout contract only; it does not change issuance, persistence, verification, or email delivery.

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
- Left vertical teal ribbon with a narrow gold centre stripe.
- Layered award rosette near the upper-left corner: serrated teal outer edge, metallic gold rim, warm gold face and restrained highlight.
- Right-side angular navy panel occupying approximately the final 20% of the page, with layered teal bevels and fine gold/teal highlights.
- Raised white logo plaque in the upper-right content area. The plaque intentionally contains no invented wordmark: the real KPX Academy logo must be supplied and placed in CERT-03.
- Main content area remains clear between the medal/ribbon and right panel.

## Dynamic content layout contract

The later HTML/SVG composition layer must position these fields independently of the decorative artwork:

1. CERTIFICATE heading.
2. OF COMPLETION subtitle.
3. Introductory line.
4. Student full name (serif display face; measured text fitting, not character-count approximation).
5. Fine horizontal divider beneath the name.
6. Training programme title (uppercase display treatment; wrap or shrink within defined bounds).
7. Achievement statement (configurable template copy with bounded line length).
8. Founder signature image or approved signature text and founder title.
9. Issue date.
10. Certificate number.
11. QR code resolving to the canonical public verification endpoint.
12. Verification URL.

Do not bake student names, programme titles, certificate numbers, issue dates, QR codes, or signatures into the decorative SVG. Those are per-certificate data and belong to the backend rendering layer.

## Typography direction

- Headings: Sora (bold / extra-bold).
- Supporting sans-serif text: Inter.
- Recipient name and certificate number: Cormorant Garamond or a similarly legible serif.
- Fonts must be bundled/embedded by the backend renderer. Do not rely on fonts installed on the Render host.
- The final renderer must measure actual glyph widths and support long names and programme titles without clipping or overlap.

## Gradient and depth treatment

- Medal: multi-stop metallic gold linear/radial gradients with controlled highlights and darker edge tones.
- Ribbon: teal linear gradient with darker edge shading and a gold pinstripe.
- Right panel: deep navy multi-stop gradient; layered teal edge bevels and low-opacity highlights.
- Logo plaque: white-to-warm-white gradient and restrained soft shadow.
- Paper: near-white/warm-ivory tonal gradient with barely visible texture.
- Avoid heavy shadows, glossy plastic effects, excessive gold, and pure-black geometry.

## Implementation constraints

- Backend owns layout, rendering, PDF generation, storage and delivery.
- The frontend must not generate or position certificate artwork.
- Keep the decorative SVG separate from per-certificate content.
- Use the same artwork and renderer for initial issuance and resend; resending must not silently create a visually different document.
- Preserve the existing certificate record, Cloudinary storage and public verification contract unless a separately reviewed migration is required.
- Do not invent a QR destination. Use the actual mounted public verification route and configured canonical public site/API origin.
- A generated PDF must be tested for A4 landscape page size, embedded fonts, text extraction, QR readability, no clipped text and consistent rendering.

## Asset dependency

Repository inspection found no committed image/font assets for certificates and no actual KPX Academy logo file in the backend repository. The logo plaque is therefore a reserved placement area. Before CERT-03, obtain the official transparent PNG or SVG logo and, if available, the approved founder signature asset. Do not recreate or approximate the logo using typed text.


## CERT-02 rendering implementation

The backend composes certificate data into the decorative SVG, inserts the official Site Branding logo when it can be retrieved from Cloudinary, generates a QR code using the vendored MIT-licensed qrcode-generator implementation, and renders the composed artwork through Cloudinary at 3508 × 2480 before wrapping the JPEG in an A4 landscape PDF.

This avoids adding a browser runtime or native rendering dependency to the Render service. The trade-off is that the current PDF is a 300-DPI raster page rather than a vector/text-selectable document. Font-family declarations currently use system fallbacks; Sora, Inter and Cormorant Garamond font binaries are not yet embedded. Visual review is required before treating this as final.

The QR target is FRONTEND_URL followed by /certificates, a number query parameter, and the verify-certificate anchor. The frontend verification page must consume the number query parameter to prefill its form; that frontend adjustment is a separate follow-up and is not included in this backend phase.

Resend retrieves the originally stored PDF from authenticated Cloudinary storage instead of regenerating it. This preserves the exact issued artifact across retries and branding changes.

## Acceptance criteria for CERT-01

- Decorative artwork is a standalone, valid SVG at A4 landscape proportions.
- The reference's major composition is retained: left medal/ribbon, central white content field, raised upper-right logo plaque and angular right panel.
- The approved KPX Academy palette is used with layered tonal gradients.
- Dynamic certificate fields are not hardcoded into the artwork.
- No existing certificate API or issuance behavior is changed in this phase.
