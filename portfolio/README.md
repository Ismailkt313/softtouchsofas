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

See `.env.example` for the company identity, location, contact, map and site URL values. These are public frontend values, not secrets. Never place private API keys in `VITE_*` variables.

The contact form is intentionally an integration point only: it validates in the browser and clearly reports that it has not sent anything. Connect it to a secure backend or vetted form service before publishing it as a working enquiry channel.

Product, project and company copy is maintained in `src/data/content.ts` and `src/App.tsx`. The editorial images in `public/editorial-*.jpg` are generated illustrative styling placeholders, not representations of actual company facilities, products or completed customer projects. They are referenced centrally in `src/App.tsx`; replace these assets and their alt text with approved company photography before launch.

## Before publication

Confirm legal company name and approved brand identity; address, city, state, postal code, country and accurate map embed/directions links; public business email and phone; canonical domain; approved company history, manufacturing details, product specifications and certifications; approved project names, locations, scope and photographs; genuine product/facility photography; enquiry delivery provider and privacy policy; sitemap domain; and any verified structured business data. No capacity, establishment date, export markets, certificates, customer names or location coordinates are invented.
