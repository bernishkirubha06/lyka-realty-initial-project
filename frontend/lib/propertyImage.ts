/**
 * Location-accurate image resolution for Lyka Realty properties
 * Integrated with official Lyka Realty (lykarealty.ae) community imagery
 */

const LOCATION_IMAGES: Record<string, string[]> = {
  downtown: [
    "https://lykarealty.ae/img/hero.jpg",
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=1200&q=80"
  ],
  palm: [
    "https://lykarealty.ae/img/palm.jpg",
    "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80"
  ],
  marina: [
    "https://lykarealty.ae/img/marina.jpg",
    "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&w=1200&q=80"
  ],
  business_bay: [
    "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1526495124232-a04e1849168c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
  ],
  hills: [
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
  ],
  jvc: [
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
  ],
  creek: [
    "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
  ],
  difc: [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80"
  ],
  ranches: [
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80"
  ],
  chennai: [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80"
  ],
  default: [
    "https://lykarealty.ae/img/community.jpg",
    "https://lykarealty.ae/img/hero.jpg",
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
  ]
};

export function getPropertyImageUrl(image_url?: string | null, locality?: string | null, city?: string | null, id: number = 1): string {
  if (image_url && image_url.startsWith("http")) {
    return image_url;
  }

  const loc = (locality || "").toLowerCase();
  const c = (city || "").toLowerCase();

  let pool = LOCATION_IMAGES.default;

  if (c.includes("chennai")) {
    pool = LOCATION_IMAGES.chennai;
  } else if (loc.includes("downtown") || loc.includes("burj") || loc.includes("opera") || loc.includes("old town")) {
    pool = LOCATION_IMAGES.downtown;
  } else if (loc.includes("palm")) {
    pool = LOCATION_IMAGES.palm;
  } else if (loc.includes("marina") || loc.includes("jbr") || loc.includes("beach") || loc.includes("harbour")) {
    pool = LOCATION_IMAGES.marina;
  } else if (loc.includes("business bay")) {
    pool = LOCATION_IMAGES.business_bay;
  } else if (loc.includes("hills") || loc.includes("meydan") || loc.includes("rashid")) {
    pool = LOCATION_IMAGES.hills;
  } else if (loc.includes("jvc") || loc.includes("village") || loc.includes("circle") || loc.includes("jvt")) {
    pool = LOCATION_IMAGES.jvc;
  } else if (loc.includes("creek") || loc.includes("lagoon") || loc.includes("jlt") || loc.includes("lake towers")) {
    pool = LOCATION_IMAGES.creek;
  } else if (loc.includes("difc") || loc.includes("quoz")) {
    pool = LOCATION_IMAGES.difc;
  } else if (loc.includes("ranches") || loc.includes("damac") || loc.includes("mudon") || loc.includes("villa")) {
    pool = LOCATION_IMAGES.ranches;
  }

  return pool[id % pool.length];
}
