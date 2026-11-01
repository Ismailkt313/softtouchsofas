export const company = {
 name: import.meta.env.VITE_COMPANY_NAME || 'Soft Touch Sofas',
 address: import.meta.env.VITE_COMPANY_ADDRESS || '', city: import.meta.env.VITE_COMPANY_CITY || '', state: import.meta.env.VITE_COMPANY_STATE || '', postal: import.meta.env.VITE_COMPANY_POSTAL_CODE || '', country: import.meta.env.VITE_COMPANY_COUNTRY || 'India', phone: import.meta.env.VITE_COMPANY_PHONE || '', email: import.meta.env.VITE_COMPANY_EMAIL || '', map: import.meta.env.VITE_COMPANY_MAP_EMBED_URL || '', directions: import.meta.env.VITE_COMPANY_MAPS_DIRECTIONS_URL || '',
};
export const collections = [
 {slug:'sofas',name:'Sofas & seating',eyebrow:'01 / Upholstered living',description:'A considered range of upholstered seating, shaped around comfort, proportion and the character of a room.',tone:'clay',tag:'Core collection'},
 {slug:'custom',name:'Made to measure',eyebrow:'02 / Custom manufacture',description:'A collaborative approach to dimensions, configurations and finishes for considered interiors.',tone:'olive',tag:'Made for your brief'},
 {slug:'curtains',name:'Curtains & drapery',eyebrow:'03 / Soft interiors',description:'Soft furnishings that bring texture, warmth and a finishing layer to residential and hospitality spaces.',tone:'sand',tag:'Interior solutions'},
 {slug:'upholstery',name:'Fabric & upholstery',eyebrow:'04 / Material stories',description:'An adaptable material offering to help bring a distinctive design vision to life.',tone:'ink',tag:'Material selection'}
];
export const projects = [
 {slug:'residential-interiors',name:'Residential interiors',type:'Residential',place:'Project details to be confirmed',tone:'clay',description:'Bespoke furniture and soft furnishings for considered homes.'},
 {slug:'hospitality-spaces',name:'Hospitality spaces',type:'Hospitality',place:'Project details to be confirmed',tone:'olive',description:'Furniture made to complement welcoming guest environments.'},
 {slug:'commercial-interiors',name:'Commercial interiors',type:'Commercial',place:'Project details to be confirmed',tone:'sand',description:'A tailored approach to furniture for shared and working spaces.'}
];
