const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";
const CART_KEY = "poshakh_cart_id";

export async function getOrCreateCart(): Promise<string> {
  const existing = localStorage.getItem(CART_KEY);
  if (existing) return existing;
  const res = await fetch(`${BACKEND}/store/carts`, {
    method: "POST",
    headers: { "x-publishable-api-key": PK, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const { cart } = await res.json();
  localStorage.setItem(CART_KEY, cart.id);
  return cart.id;
}

export async function addMedusaLineItem(cartId: string, variantId: string, quantity: number): Promise<string | null> {
  const res = await fetch(`${BACKEND}/store/carts/${cartId}/line-items`, {
    method: "POST",
    headers: { "x-publishable-api-key": PK, "Content-Type": "application/json" },
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });
  if (!res.ok) return null;
  const { cart } = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const li = cart.items?.find((i: any) => i.variant_id === variantId);
  return li?.id ?? null;
}

export async function removeMedusaLineItem(cartId: string, lineItemId: string): Promise<void> {
  await fetch(`${BACKEND}/store/carts/${cartId}/line-items/${lineItemId}`, {
    method: "DELETE",
    headers: { "x-publishable-api-key": PK },
  });
}

export async function updateMedusaLineItem(cartId: string, lineItemId: string, quantity: number): Promise<void> {
  await fetch(`${BACKEND}/store/carts/${cartId}/line-items/${lineItemId}`, {
    method: "POST",
    headers: { "x-publishable-api-key": PK, "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
}
