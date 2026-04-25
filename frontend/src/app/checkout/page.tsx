"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/store";
import { ShippingAddress } from "@/types";

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: "44px", border: "1px solid #d1d5db", padding: "0 12px",
  fontSize: "14px", color: "#1A1410", background: "#fff", outline: "none",
  borderRadius: "4px", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px", fontWeight: 600, letterSpacing: "1px", color: "#555",
  textTransform: "uppercase", display: "block", marginBottom: "6px",
};

type Step = 1 | 2 | 3;

interface ShippingOption { id: string; name: string; amount: number; }

export default function CheckoutPage() {
  const { cart, cartId, customer, savedAddress, setSavedAddress, clearCart, setCartId, setPendingOrder } = useStore();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [addr, setAddr] = useState<ShippingAddress>(savedAddress ?? {
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
    address: "", apartment: "", city: "", state: "", pinCode: "",
    phone: customer?.phone ?? "",
  });
  const [shipping, setShipping] = useState<"free" | "express">("free");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [paying, setPaying] = useState(false);

  // Fetch real Medusa shipping option IDs on mount
  useEffect(() => {
    if (!cartId) return;
    fetch(`${BACKEND}/store/shipping-options?cart_id=${cartId}`, {
      headers: { "x-publishable-api-key": PK },
    })
      .then(r => r.json())
      .then(data => {
        if (data.shipping_options) setShippingOptions(data.shipping_options);
      })
      .catch(() => {});
  }, [cartId]);

  // Pre-fill address from Medusa if customer has a saved address
  useEffect(() => {
    if (!customer?.id || savedAddress) return;
    fetch(`${BACKEND}/store/customers/me`, {
      headers: { "x-publishable-api-key": PK },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const addresses = data?.customer?.addresses;
        if (addresses?.length > 0) {
          const a = addresses[0];
          const mapped: ShippingAddress = {
            firstName: a.first_name ?? customer.firstName ?? "",
            lastName: a.last_name ?? customer.lastName ?? "",
            address: a.address_1 ?? "",
            apartment: a.address_2 ?? "",
            city: a.city ?? "",
            state: a.province ?? "",
            pinCode: a.postal_code ?? "",
            phone: a.phone ?? customer.phone ?? "",
          };
          setAddr(mapped);
          setSavedAddress(mapped);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const subtotal = cart.reduce((t, i) => t + i.price * i.quantity, 0);
  const shippingCost = shipping === "express" && subtotal < 25000 ? 199 : 0;
  const total = subtotal + shippingCost;

  if (cart.length === 0) {
    return (
      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "160px 40px", textAlign: "center" }}>
        <p style={{ fontSize: "16px", color: "#555", marginBottom: "24px" }}>Your cart is empty.</p>
        <Link href="/products" style={{ backgroundColor: "#3D0D16", color: "#E0C275", padding: "14px 32px", textDecoration: "none", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
          SHOP NOW
        </Link>
      </main>
    );
  }

  const handleAddrChange = (field: keyof ShippingAddress, value: string) =>
    setAddr((prev) => ({ ...prev, [field]: value }));

  const handleInfoSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSavedAddress(addr);

    if (customer?.id) {
      try {
        await fetch(`${BACKEND}/store/customers/me`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
          body: JSON.stringify({
            shipping_addresses: [{
              first_name: addr.firstName,
              last_name: addr.lastName,
              address_1: addr.address,
              address_2: addr.apartment ?? "",
              city: addr.city,
              province: addr.state,
              postal_code: addr.pinCode,
              phone: addr.phone,
              country_code: "in",
            }],
          }),
        });
      } catch {
        // address already stored in Zustand; backend save is best-effort
      }
    }

    setStep(2);
  };

  const finishOrder = async (paymentId: string) => {
    // Save pending order for confirmation page
    const pendingOrder = {
      id: `ORD-${Date.now()}`,
      paymentId,
      date: new Date().toISOString(),
      items: [...cart],
      subtotal,
      shippingAddress: addr,
      shippingMethod: shipping,
    };
    setPendingOrder(pendingOrder);

    // Sync to Medusa backend if we have a cartId
    if (cartId) {
      const shippingOption = shippingOptions.find(o =>
        shipping === "free"
          ? o.name.toLowerCase().includes("standard")
          : o.name.toLowerCase().includes("express")
      ) ?? shippingOptions[0];

      try {
        await fetch(`${BACKEND}/store/checkout/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
          body: JSON.stringify({
            cart_id: cartId,
            email: customer?.email ?? `${addr.phone}@poshakh.in`,
            customer_id: customer?.id,
            shipping_address: addr,
            shipping_option_id: shippingOption?.id,
          }),
        });
      } catch (e) {
        console.warn("Medusa order creation failed (order still saved locally):", e);
      }
    }

    clearCart();
    setCartId(null);
    localStorage.removeItem("poshakh_cart_id");
    router.push(`/order-confirmation?paymentId=${paymentId}`);
  };

  const handleRazorpay = async () => {
    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { alert("Could not load payment gateway. Please try again."); return; }

      const res = await fetch(`${BACKEND}/store/checkout/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
        body: JSON.stringify({ amount_in_rupees: total }),
      });
      const data = await res.json();
      if (!data.razorpay_order_id) throw new Error("Order creation failed");

      const rzp = new (window as any).Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Poshakh",
        description: `${cart.length} item${cart.length > 1 ? "s" : ""}`,
        order_id: data.razorpay_order_id,
        prefill: {
          name: `${addr.firstName} ${addr.lastName}`.trim(),
          email: customer?.email ?? "",
          contact: addr.phone,
        },
        theme: { color: "#3D0D16" },
        handler: async (response: any) => {
          const verify = await fetch(`${BACKEND}/store/checkout/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const vData = await verify.json();
          if (vData.success) finishOrder(vData.payment_id);
          else alert("Payment verification failed. Contact support.");
        },
      });
      rzp.on("payment.failed", () => alert("Payment failed. Please try again."));
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const handleSimulate = () => {
    finishOrder(`pay_dev_${Date.now()}`);
  };

  const breadcrumb = ["Cart", "Information", "Shipping", "Payment"];
  const stepIndex = step === 1 ? 1 : step === 2 ? 2 : 3;

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #e5e7eb", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Link href="/" style={{ fontFamily: "var(--font-heading)", fontSize: "22px", letterSpacing: "4px", color: "#2A2520", textDecoration: "none" }}>
          POSHAKH
        </Link>
      </header>

      <div style={{ display: "flex", maxWidth: "1100px", margin: "0 auto", padding: "40px 20px", gap: "60px", flexWrap: "wrap" }}>

        {/* LEFT — Form */}
        <div style={{ flex: "1 1 480px" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "32px", fontSize: "13px" }}>
            {breadcrumb.map((b, i) => (
              <span key={b} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {i > 0 && <span style={{ color: "#ccc" }}>›</span>}
                <span style={{ color: i === stepIndex ? "#3D0D16" : i < stepIndex ? "#555" : "#bbb", fontWeight: i === stepIndex ? 600 : 400 }}>{b}</span>
              </span>
            ))}
          </div>

          {/* STEP 1 — Information */}
          {step === 1 && (
            <form onSubmit={handleInfoSubmit}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1A1410", marginBottom: "20px" }}>Contact</h2>
              <div style={{ marginBottom: "20px" }}>
                <input
                  type="email"
                  value={customer?.email ?? ""}
                  readOnly
                  placeholder="Email"
                  style={{ ...inputStyle, background: "#f9f9f9", color: "#888" }}
                />
                {!customer && <p style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}>
                  <Link href="/" style={{ color: "#3D0D16" }}>Sign in</Link> for faster checkout
                </p>}
              </div>

              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1A1410", marginBottom: "20px" }}>Shipping address</h2>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Country / Region</label>
                <input type="text" value="India" readOnly style={{ ...inputStyle, background: "#f9f9f9", color: "#888" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>First name</label>
                  <input type="text" value={addr.firstName} onChange={e => handleAddrChange("firstName", e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last name</label>
                  <input type="text" value={addr.lastName} onChange={e => handleAddrChange("lastName", e.target.value)} required style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Address</label>
                <input type="text" value={addr.address} onChange={e => handleAddrChange("address", e.target.value)} required style={inputStyle} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Apartment, suite, etc. (optional)</label>
                <input type="text" value={addr.apartment ?? ""} onChange={e => handleAddrChange("apartment", e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>City</label>
                  <input type="text" value={addr.city} onChange={e => handleAddrChange("city", e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <select value={addr.state} onChange={e => handleAddrChange("state", e.target.value)} required style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">Select</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>PIN Code</label>
                  <input type="text" value={addr.pinCode} onChange={e => handleAddrChange("pinCode", e.target.value)} required maxLength={6} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: "28px" }}>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={addr.phone} onChange={e => handleAddrChange("phone", e.target.value)} required style={inputStyle} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Link href="/products" style={{ fontSize: "13px", color: "#555", textDecoration: "none" }}>← Return to cart</Link>
                <button type="submit" style={{ backgroundColor: "#3D0D16", color: "#E0C275", padding: "14px 32px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                  Continue to shipping
                </button>
              </div>
            </form>
          )}

          {/* STEP 2 — Shipping */}
          {step === 2 && (
            <div>
              {/* Summary boxes */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", marginBottom: "24px" }}>
                {[
                  { label: "Contact", value: customer?.email ?? addr.phone },
                  { label: "Ship to", value: `${addr.address}${addr.apartment ? ", " + addr.apartment : ""}, ${addr.city}, ${addr.state} ${addr.pinCode}, India` },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i === 0 ? "1px solid #e5e7eb" : "none", fontSize: "14px" }}>
                    <span style={{ color: "#888", minWidth: "70px" }}>{row.label}</span>
                    <span style={{ color: "#1A1410", flex: 1, margin: "0 12px" }}>{row.value}</span>
                    <button onClick={() => setStep(1)} style={{ color: "#3D0D16", background: "none", border: "none", cursor: "pointer", fontSize: "13px", textDecoration: "underline" }}>Change</button>
                  </div>
                ))}
              </div>

              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1A1410", marginBottom: "16px" }}>Shipping method</h2>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", marginBottom: "28px" }}>
                {([["free", "Free Shipping", "7–10 business days", "FREE"],
                   ["express", "Express Shipping", "3–5 business days", subtotal >= 25000 ? "FREE" : "₹199"]] as const).map(([val, name, days, price]) => (
                  <label key={val} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: val === "free" ? "1px solid #e5e7eb" : "none", cursor: "pointer", gap: "12px" }}>
                    <input type="radio" name="shipping" value={val} checked={shipping === val} onChange={() => setShipping(val)} style={{ accentColor: "#3D0D16" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: "14px" }}>{name}</div>
                      <div style={{ fontSize: "12px", color: "#888" }}>{days}</div>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>{price}</span>
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setStep(1)} style={{ fontSize: "13px", color: "#555", background: "none", border: "none", cursor: "pointer" }}>← Return to information</button>
                <button onClick={() => setStep(3)} style={{ backgroundColor: "#3D0D16", color: "#E0C275", padding: "14px 32px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                  Continue to payment
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Payment */}
          {step === 3 && (
            <div>
              {/* Summary boxes */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", marginBottom: "24px" }}>
                {[
                  { label: "Contact", value: customer?.email ?? addr.phone },
                  { label: "Ship to", value: `${addr.address}${addr.apartment ? ", " + addr.apartment : ""}, ${addr.city} ${addr.pinCode}` },
                  { label: "Shipping", value: shipping === "free" || subtotal >= 25000 ? "Free Shipping · FREE" : "Express Shipping · ₹199" },
                ].map((row, i, arr) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #e5e7eb" : "none", fontSize: "14px" }}>
                    <span style={{ color: "#888", minWidth: "70px" }}>{row.label}</span>
                    <span style={{ color: "#1A1410", flex: 1, margin: "0 12px" }}>{row.value}</span>
                    <button onClick={() => setStep(i === 2 ? 2 : 1)} style={{ color: "#3D0D16", background: "none", border: "none", cursor: "pointer", fontSize: "13px", textDecoration: "underline" }}>Change</button>
                  </div>
                ))}
              </div>

              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1A1410", marginBottom: "8px" }}>Payment</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>All transactions are secure and encrypted.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
                <button
                  onClick={handleRazorpay}
                  disabled={paying}
                  style={{ backgroundColor: "#3D0D16", color: "#E0C275", padding: "16px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", opacity: paying ? 0.6 : 1 }}
                >
                  {paying ? "PREPARING..." : `PAY ₹${total.toLocaleString("en-IN")} WITH RAZORPAY`}
                </button>
                {process.env.NODE_ENV === "development" && (
                  <button
                    onClick={handleSimulate}
                    style={{ padding: "12px", border: "1px solid #d1d5db", background: "#f9f9f9", cursor: "pointer", fontSize: "12px", color: "#888", letterSpacing: "1px", textTransform: "uppercase" }}
                  >
                    [DEV] Simulate Payment
                  </button>
                )}
              </div>

              <button onClick={() => setStep(2)} style={{ fontSize: "13px", color: "#555", background: "none", border: "none", cursor: "pointer" }}>← Return to shipping</button>
            </div>
          )}
        </div>

        {/* RIGHT — Order Summary */}
        <div style={{ flex: "0 0 340px", borderLeft: "1px solid #e5e7eb", paddingLeft: "40px" }}>
          <div style={{ position: "sticky", top: "40px" }}>
            {cart.map(item => (
              <div key={item.id} style={{ display: "flex", gap: "14px", marginBottom: "18px", alignItems: "center" }}>
                <div style={{ position: "relative", width: "60px", height: "80px", flexShrink: 0, border: "1px solid #e5e7eb" }}>
                  <span style={{ position: "absolute", top: "-8px", right: "-8px", background: "#3D0D16", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, zIndex: 1 }}>{item.quantity}</span>
                  <Image src={item.image || "/images/products/saree1.png"} alt={item.name} fill style={{ objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "#1A1410", marginBottom: "4px" }}>{item.name}</p>
                  <p style={{ fontSize: "12px", color: "#888" }}>{item.size}</p>
                </div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#1A1410" }}>₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
              </div>
            ))}

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", marginTop: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#555", marginBottom: "10px" }}>
                <span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#555", marginBottom: "16px" }}>
                <span>Shipping</span>
                <span>{shippingCost === 0 ? "FREE" : `₹${shippingCost}`}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: 700, color: "#1A1410", borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                <span>Total</span>
                <span style={{ fontSize: "13px", color: "#888", alignSelf: "flex-end", marginRight: "4px" }}>INR</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
