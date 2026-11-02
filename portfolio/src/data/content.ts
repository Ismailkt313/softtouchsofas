const configuredAddress: string | undefined = import.meta.env.VITE_COMPANY_ADDRESS?.trim();

export const company = {
  name: import.meta.env.VITE_COMPANY_NAME || 'Soft Touch Sofas',
  addressLines: configuredAddress ? configuredAddress.split('|').map((line) => line.trim()).filter(Boolean) : ['Vadakkemanna', 'Tirur Manjeri Road', 'Malappuram, Kerala, India'],
  phone: import.meta.env.VITE_COMPANY_PHONE || '+91 99958 71077',
  whatsapp: 'https://wa.me/919995871077?text=Hello%20Soft%20Touch%20Sofas%2C%20I%20would%20like%20to%20know%20more%20about%20your%20sofas%2C%20curtains%20and%20upholstery%20solutions.',
  instagram: 'https://www.instagram.com/softtouch.home/',
  email: import.meta.env.VITE_COMPANY_EMAIL || '',
};

// Every photo is a replaceable, generated illustrative asset—not a company claim, installation, or facility image.
export const imageManifest = {
  livingRoom: { src: '/editorial-living-room.jpg', alt: 'Illustrative dark upholstered sofa in a warm contemporary living room', caption: 'Illustrative interior · replace with approved company photography' },
  upholsteryCraft: { src: '/editorial-upholstery-detail.jpg', alt: 'Illustrative upholstery work: a chair being carefully covered in textured fabric', caption: 'Illustrative craft scene · not Soft Touch Sofas workshop photography' },
  draperyRoom: { src: '/editorial-drapery-room.jpg', alt: 'Illustrative linen curtains and upholstered seating in a light-filled room', caption: 'Illustrative interior · not a verified curtain installation' },
  sofaCraft: { src: '/sofa-craftsmanship.jpg', alt: 'Illustrative furniture craft scene showing upholstery work on a chair frame', caption: 'Illustrative craft scene · not Soft Touch Sofas workshop photography' },
  sofaBuild: { src: '/sofa-upholstery-work.jpg', alt: 'Illustrative craft scene of a sofa being upholstered over its frame', caption: 'Illustrative sofa upholstery scene · not Soft Touch Sofas workshop photography' },
  sectional: { src: '/sectional-sofa-interior.jpg', alt: 'Illustrative contemporary sectional sofa in a warm living room', caption: 'Illustrative furniture styling · not a confirmed product' },
  stitching: { src: '/fabric-stitch-detail.jpg', alt: 'Illustrative close view of upholstery fabric being stitched', caption: 'Illustrative craft scene · not Soft Touch Sofas workshop photography' },
  curtainDetail: { src: '/curtain-linen-detail.jpg', alt: 'Illustrative close view of natural linen curtain folds', caption: 'Illustrative textile styling · not a verified installation' },
  upholsteryTexture: { src: '/upholstery-texture.jpg', alt: 'Illustrative tactile upholstery fabrics and a furniture seam', caption: 'Illustrative material styling · not a product specification' },
  residential: { src: '/residential-project-interior.jpg', alt: 'Illustrative residential living room with a sofa and linen curtains', caption: 'Illustrative project styling · not a Soft Touch Sofas client project' },
  international: { src: '/international-sofa-interior.jpg', alt: 'Illustrative upholstered sofa in a sun-washed contemporary interior', caption: 'Illustrative interior · not a confirmed Soft Touch Sofas product' },
  sofaFinish: { src: '/sofa-finish-detail.jpg', alt: 'Illustrative close-up of a finished upholstered sofa arm and seam', caption: 'Illustrative product detail · not a confirmed Soft Touch Sofas product' },
  closingLiving: { src: '/sofa-detail-lifestyle.jpg', alt: 'Illustrative tailored upholstered loveseat in a warm interior', caption: 'Illustrative interior · not a confirmed Soft Touch Sofas product' },
} as const;

export const collections = [
  { slug: 'sofas', name: 'Sofas', eyebrow: '01 / Upholstered living', description: 'Sofa designs and seating for considered, comfortable spaces.', image: 'sectional' as const },
  { slug: 'custom', name: 'Custom sofas', eyebrow: '02 / Made for your brief', description: 'A collaborative approach to sofa form, fabric and fit.', image: 'livingRoom' as const },
  { slug: 'curtains', name: 'Curtains', eyebrow: '03 / Windows & drapery', description: 'Curtains and soft window treatments for considered interiors.', image: 'curtainDetail' as const },
  { slug: 'upholstery', name: 'Upholstery', eyebrow: '04 / Fabric & finish', description: 'Upholstery solutions with a focus on texture and detail.', image: 'upholsteryTexture' as const },
];

export const projects = [
  { slug: 'residential-interiors', name: 'Residential interiors', type: 'Residential', place: 'Project details to be confirmed', description: 'Residential furniture settings. Photography and project details to be confirmed.', image: 'residential' as const },
  { slug: 'hospitality-spaces', name: 'Hospitality spaces', type: 'Hospitality', place: 'Project details to be confirmed', description: 'Hospitality furniture settings. Photography and project details to be confirmed.', image: 'draperyRoom' as const },
  { slug: 'commercial-interiors', name: 'Commercial interiors', type: 'Commercial', place: 'Project details to be confirmed', description: 'Commercial furniture settings. Photography and project details to be confirmed.', image: 'livingRoom' as const },
];
