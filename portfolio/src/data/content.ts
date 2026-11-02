const configuredAddress: string | undefined = import.meta.env.VITE_COMPANY_ADDRESS?.trim();

export const company = {
  name: import.meta.env.VITE_COMPANY_NAME || 'Soft Touch Sofas',
  addressLines: configuredAddress ? configuredAddress.split('|').map((line) => line.trim()).filter(Boolean) : ['Vadakkemanna', 'Tirur Manjeri Road', 'Malappuram, Kerala, India'],
  phone: import.meta.env.VITE_COMPANY_PHONE || '+91 99958 71077',
  whatsapp: 'https://wa.me/919995871077?text=Hello%20Soft%20Touch%20Sofas%2C%20I%20would%20like%20to%20know%20more%20about%20your%20sofas%2C%20curtains%20and%20upholstery%20solutions.',
  instagram: 'https://www.instagram.com/softtouch.home/',
  email: import.meta.env.VITE_COMPANY_EMAIL || '',
};

// Replace these illustrative assets with approved company photography when available.
export const imageManifest = {
  livingRoom: { src: '/editorial-living-room.jpg', alt: 'Dark sofa in a warm living room' },
  upholsteryCraft: { src: '/editorial-upholstery-detail.jpg', alt: 'Upholstery work on a chair' },
  draperyRoom: { src: '/editorial-drapery-room.jpg', alt: 'Curtains and seating in a bright room' },
  sofaCraft: { src: '/sofa-craftsmanship.jpg', alt: 'Upholstery work on a chair frame' },
  sofaBuild: { src: '/sofa-upholstery-work.jpg', alt: 'A sofa being upholstered' },
  sectional: { src: '/sectional-sofa-interior.jpg', alt: 'Sectional sofa in a living room' },
  stitching: { src: '/fabric-stitch-detail.jpg', alt: 'Close-up of upholstery stitching' },
  curtainDetail: { src: '/curtain-linen-detail.jpg', alt: 'Close-up of linen curtains' },
  upholsteryTexture: { src: '/upholstery-texture.jpg', alt: 'Upholstery fabric and a furniture seam' },
  residential: { src: '/residential-project-interior.jpg', alt: 'Sofa and curtains in a home' },
  international: { src: '/international-sofa-interior.jpg', alt: 'Sofa in a bright modern room' },
  sofaFinish: { src: '/sofa-finish-detail.jpg', alt: 'Close-up of a sofa arm and seam' },
  closingLiving: { src: '/sofa-detail-lifestyle.jpg', alt: 'Brown loveseat in a warm room' },
} as const;

export const collections = [
  { slug: 'sofas', name: 'Sofas', eyebrow: 'Sofas', description: 'Sofas for living rooms and homes.', image: 'sectional' as const },
  { slug: 'custom', name: 'Custom-made sofas', eyebrow: 'Custom-made sofas', description: 'Choose a sofa style, fabric and size for your room.', image: 'livingRoom' as const },
  { slug: 'curtains', name: 'Curtains', eyebrow: 'Curtains', description: 'Curtains for living rooms, bedrooms and other spaces.', image: 'curtainDetail' as const },
  { slug: 'upholstery', name: 'Upholstery', eyebrow: 'Upholstery', description: 'Upholstery for furniture and soft furnishings.', image: 'upholsteryTexture' as const },
];

export const featuredCollections = collections.filter((collection) => collection.slug !== 'custom');

export const projects = [
  { slug: 'residential-interiors', name: 'Homes', type: 'Residential', place: 'Details to be confirmed', description: 'Photos and details about home projects will be added when available.', image: 'residential' as const },
  { slug: 'hospitality-spaces', name: 'Hotels and guest spaces', type: 'Hospitality', place: 'Details to be confirmed', description: 'Photos and details about hotel projects will be added when available.', image: 'draperyRoom' as const },
  { slug: 'commercial-interiors', name: 'Other spaces', type: 'Commercial', place: 'Details to be confirmed', description: 'Photos and details about other projects will be added when available.', image: 'livingRoom' as const },
];
