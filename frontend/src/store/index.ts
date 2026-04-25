import { create } from 'zustand';
import { CartItem, ShippingAddress, Order } from '@/types';

interface Customer {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
}

interface GlobalState {
  // Cart
  cart: CartItem[];
  cartId: string | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setCartId: (id: string | null) => void;
  updateLineItemId: (cartItemId: string, lineItemId: string) => void;

  // Auth
  customer: Customer | null;
  setCustomer: (customer: Customer) => void;
  logout: () => void;

  // Orders
  orders: Order[];
  addOrder: (order: Order) => void;

  // Pending order (transient — between checkout and order-confirmation)
  pendingOrder: Order | null;
  setPendingOrder: (order: Order | null) => void;

  // Saved address
  savedAddress: ShippingAddress | null;
  setSavedAddress: (address: ShippingAddress) => void;

  // Session
  isSessionReady: boolean;
  setSessionReady: () => void;

  // UI States
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  isAccountDrawerOpen: boolean;
  setAccountDrawerOpen: (open: boolean) => void;
}

export const useStore = create<GlobalState>((set) => ({
  cart: [],
  cartId: typeof window !== "undefined" ? localStorage.getItem("poshakh_cart_id") : null,
  customer: null,
  orders: [],
  savedAddress: null,
  pendingOrder: null,

  addToCart: (item) => set((state) => {
    const existing = state.cart.find((c) => c.id === item.id);
    if (existing) {
      return { cart: state.cart.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + item.quantity } : c) };
    }
    return { cart: [...state.cart, item] };
  }),

  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((c) => c.id !== id) })),

  updateQuantity: (id, quantity) => set((state) => ({
    cart: quantity <= 0
      ? state.cart.filter((c) => c.id !== id)
      : state.cart.map((c) => c.id === id ? { ...c, quantity } : c),
  })),

  clearCart: () => set({ cart: [] }),
  setCartId: (id) => set({ cartId: id }),

  updateLineItemId: (cartItemId, lineItemId) => set((state) => ({
    cart: state.cart.map((c) => c.id === cartItemId ? { ...c, lineItemId } : c),
  })),

  setCustomer: (customer) => set({ customer }),

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ customer: null });
  },

  addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),

  setPendingOrder: (order) => set({ pendingOrder: order }),

  setSavedAddress: (address) => set({ savedAddress: address }),

  isSessionReady: false,
  setSessionReady: () => set({ isSessionReady: true }),

  isCartOpen: false,
  setCartOpen: (open) => set({ isCartOpen: open }),
  isAccountDrawerOpen: false,
  setAccountDrawerOpen: (open) => set({ isAccountDrawerOpen: open }),
}));
