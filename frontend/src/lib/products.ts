import { Product } from "@/types";

const BACKEND = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

// Maps Medusa category name → URL param used in the frontend
const CATEGORY_MAP: Record<string, string> = {
  Sarees: "sarees",
  "Salwar Kameez": "salwar",
  Lehengas: "lehenga",
  Gowns: "gowns",
};

// Fallback images by category
const FALLBACK_IMAGES_BY_CATEGORY: Record<string, string[]> = {
  sarees: ["/images/products/saree1.png", "/images/products/saree2.png"],
  salwar: ["/images/products/anarkali1.png", "/images/products/sharara1.png"],
  lehenga: ["/images/products/lehenga1.png", "/images/products/lehenga2.png"],
  gowns: ["/images/products/gown1.png"],
};

function formatINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMedusaProduct(p: any): Product {
  const firstVariant = p.variants?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inrPrice = firstVariant?.prices?.find((pr: any) => pr.currency_code === "inr")
    ?? firstVariant?.prices?.[0];
  const amount: number = inrPrice?.amount ?? 0;

  const medusaCatName: string = p.categories?.[0]?.name ?? "";
  const category = CATEGORY_MAP[medusaCatName] ?? medusaCatName.toLowerCase();

  // Get images from Medusa, or use fallback images for the category
  let images = p.images?.map((img: any) => img.url) ?? [];
  if (images.length === 0) {
    images = FALLBACK_IMAGES_BY_CATEGORY[category] ?? ["/images/products/saree1.png"];
  }

  const variants = p.variants?.map((v: any) => ({
    id: v.id,
    size: v.options?.find((o: any) => o.option?.title?.toLowerCase() === "size")?.value ?? v.title,
  })) ?? [];

  return {
    id: p.id,
    name: p.title,
    price: Math.round(amount / 100),
    formattedPrice: formatINR(amount),
    images,
    category: category as Product["category"],
    description: p.description ?? "",
    variants,
  };
}

// Static fallback used when publishable key is not yet configured
const staticProducts: Product[] = [
  {
    id: "1",
    name: "Maroon Banarasi Silk Saree",
    price: 5999,
    formattedPrice: "₹5,999",
    images: ["/images/products/saree1.png", "/images/products/saree2.png"],
    category: "sarees",
    description: "A luxurious deep maroon banarasi silk saree with gold zari work.",
  },
  {
    id: "2",
    name: "Gold Embroidered Sharara Set",
    price: 4499,
    formattedPrice: "₹4,499",
    images: ["/images/products/sharara1.png", "/images/products/sharara2.png"],
    category: "salwar",
    description: "Elegant cream sharara set with gold embroidery.",
  },
  {
    id: "3",
    name: "Ivory Anarkali Suit",
    price: 3499,
    formattedPrice: "₹3,499",
    images: ["/images/products/anarkali1.png"],
    category: "salwar",
    description: "Floor-length ivory Anarkali with delicate embroidery.",
  },
  {
    id: "4",
    name: "Blush Pink Bridal Lehenga",
    price: 12999,
    formattedPrice: "₹12,999",
    images: ["/images/products/lehenga1.png", "/images/products/lehenga2.png"],
    category: "lehenga",
    description: "Exquisite blush pink bridal lehenga with zardozi work.",
  },
  {
    id: "5",
    name: "Navy Velvet Evening Gown",
    price: 4999,
    formattedPrice: "₹4,999",
    images: ["/images/products/gown1.png"],
    category: "gowns",
    description: "Regal navy velvet indo-western evening gown.",
  },
];

export async function getProducts(cat?: string): Promise<Product[]> {
  // Fall back to static data if publishable key isn't configured yet
  if (!PK) {
    if (!cat) return staticProducts;
    if (["new", "bridal", "festive", "bestsellers"].includes(cat)) return staticProducts;
    return staticProducts.filter((p) => p.category === cat);
  }

  try {
    const res = await fetch(
      `${BACKEND}/store/products?limit=100&fields=*variants.prices,*categories,*images`,
      {
        headers: { "x-publishable-api-key": PK },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error(`Medusa fetch failed: ${res.status}`);

    const { products } = await res.json();
    const mapped: Product[] = products.map(mapMedusaProduct);

    if (!cat) return mapped;
    if (["new", "bridal", "festive", "bestsellers"].includes(cat)) return mapped;
    return mapped.filter((p) => p.category === cat);
  } catch (err) {
    console.error("Medusa product fetch error, using static fallback:", err);
    if (!cat) return staticProducts;
    return staticProducts.filter((p) => p.category === cat);
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!PK) {
    return staticProducts.find((p) => p.id === id) ?? null;
  }

  try {
    const res = await fetch(
      `${BACKEND}/store/products/${id}?fields=*variants.prices,*categories,*images`,
      {
        headers: { "x-publishable-api-key": PK },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const { product } = await res.json();
    return mapMedusaProduct(product);
  } catch {
    return staticProducts.find((p) => p.id === id) ?? null;
  }
}

// Keep backward-compat named export
export const products = staticProducts;
export const getProductsByCategory = (cat: string) =>
  staticProducts.filter((p) => p.category === cat);
