import { notFound } from "next/navigation";
import { getProductById, getProducts } from "@/lib/products";
import ProductDetailClient from "./ProductDetailClient";

export async function generateStaticParams() {
  try {
    const products = await getProducts();
    return products.map((product) => ({
      id: product.id,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const encodedMessage = encodeURIComponent(`Hi, I am interested in ${product.name} from Poshakh`);
  const whatsappUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919999999999'}?text=${encodedMessage}`;

  return <ProductDetailClient product={product} whatsappUrl={whatsappUrl} />;
}
