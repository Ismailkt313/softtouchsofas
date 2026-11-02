# Soft Touch Sofas — Portfolio

A standalone public-facing corporate portfolio application in `portfolio/`. It is intentionally independent of the existing ERP frontend/backend. No backend, database, authentication, or ERP packages are used.

## Develop and build

```sh
cd portfolio
cp .env.example .env.local
npm install
npm run dev
npm run build
npm run preview
```

Deploy the generated `portfolio/dist` directory to any static host with SPA history fallback enabled. Configure `VITE_SITE_URL` and the matching canonical, Open Graph, robots, and sitemap URLs before launch.

## Configuration

See `.env.example` for the company identity, address, phone and site URL. Separate address lines are configured with `|` separators. Instagram/WhatsApp links and visual content are centralized in `src/data/content.ts`. No map is embedded. These are public frontend values, not secrets. Never place private API keys in `VITE_*` variables.

The contact form is intentionally an integration point only: it validates in the browser and clearly reports that it has not sent anything. Connect it to a secure backend or vetted form service before publishing it as a working enquiry channel.

Product, project and company copy is maintained in `src/data/content.ts` and `src/App.tsx`. All images in `public/*.jpg` are generated illustrative placeholders, not actual company products, facilities, staff or completed customer projects. Their section-specific source, alt text and caveat are maintained in `src/data/content.ts` (`imageManifest`). Replace them with approved company photography before launch; no image should be described as a verified Soft Touch Sofas process or installation.

## Before publication

Before launch, replace generated illustrative photos with approved company product, workshop and project photography; confirm the public email; confirm the business address and contact details; set the canonical site domain; connect the contact form to secure enquiry delivery and publish a privacy notice; and add only verified company history, product specifications, manufacturing details and certificates. The address, phone, Instagram and WhatsApp are currently configured from the information supplied. No maps are embedded and no capacity, establishment date, export markets, certificates, clients or manufacturing standards are invented.
