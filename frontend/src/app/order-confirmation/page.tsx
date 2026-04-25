"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { useStore } from "@/store";

function OrderConfirmationContent() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const { pendingOrder, setPendingOrder, addOrder } = useStore();

  useEffect(() => {
    if (pendingOrder) {
      addOrder(pendingOrder);
      setPendingOrder(null);
    }
  }, [pendingOrder, addOrder, setPendingOrder]);

  return (
    <main style={{ maxWidth: "700px", margin: "0 auto", padding: "160px 40px 80px", textAlign: "center" }}>
      <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#3D0D16", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E0C275" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", letterSpacing: "3px", color: "#2A2520", textTransform: "uppercase", marginBottom: "16px" }}>
        Order Confirmed
      </h1>
      <p style={{ fontSize: "15px", color: "#555", lineHeight: 1.7, marginBottom: "12px", fontFamily: "var(--font-body)" }}>
        Thank you for shopping with Poshakh. Your payment was successful and your order is being processed.
      </p>
      {paymentId && (
        <p style={{ fontSize: "12px", color: "#999", letterSpacing: "1px", marginBottom: "16px", fontFamily: "var(--font-body)" }}>
          Payment ID: {paymentId}
        </p>
      )}
      <p style={{ fontSize: "14px", color: "#555", marginBottom: "48px", fontFamily: "var(--font-body)" }}>
        Our team will reach out via WhatsApp within 24 hours to confirm delivery details and measurements (if applicable).
      </p>

      <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/products" style={{ display: "inline-block", backgroundColor: "#3D0D16", color: "#E0C275", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textDecoration: "none", padding: "16px 32px", textTransform: "uppercase", fontFamily: "var(--font-body)" }}>
          CONTINUE SHOPPING
        </Link>
        <Link href="/account" style={{ display: "inline-block", border: "1px solid #3D0D16", color: "#3D0D16", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textDecoration: "none", padding: "16px 32px", textTransform: "uppercase", fontFamily: "var(--font-body)" }}>
          VIEW MY ORDERS
        </Link>
      </div>
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense>
      <OrderConfirmationContent />
    </Suspense>
  );
}
