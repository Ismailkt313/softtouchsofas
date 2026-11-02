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

The Contact page intentionally has no email enquiry form because no public business email was supplied. It directs visitors to the configured WhatsApp, phone, Instagram and postal address. Add an enquiry form only if a public email and secure submission destination are provided.

Product, project and company copy is maintained in `src/data/content.ts` and `src/App.tsx`. Images in `public/*.jpg` are illustrative and are not verified company products, facilities, staff or completed projects. Their source and descriptive alt text are listed in `src/data/content.ts` (`imageManifest`). Replace them with approved company photography before launch, and do not describe any image as a verified Soft Touch Sofas product or installation.

## Before publication

Before launch, replace generated illustrative photos with approved company product, workshop and project photography; confirm the public email; confirm the business address and contact details; set the canonical site domain; provide a public business email before adding an email enquiry form; and add only verified company history, product specifications, manufacturing details and certificates. The address, phone, Instagram and WhatsApp are currently configured from the information supplied. No maps are embedded and no capacity, establishment date, export markets, certificates, clients or manufacturing standards are invented.
