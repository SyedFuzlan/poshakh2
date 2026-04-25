"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { sendPhoneOTP, verifyPhoneOTP } from "@/lib/auth";


const benefits = [
  "Checkout faster",
  "Track orders",
  "Loyalty rewards",
  "Be the first to see new products & promotions",
];

const inputStyle: React.CSSProperties = {
  width: "100%", height: "50px", border: "1px solid rgba(201,168,76,0.3)",
  padding: "0 16px", fontSize: "14px", color: "#1A1410",
  fontFamily: "var(--font-body)", background: "#fff", boxSizing: "border-box",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  width: "100%", height: "52px", background: "#3D0D16", color: "#E0C275",
  fontSize: "11px", fontWeight: 600, letterSpacing: "2.5px",
  textTransform: "uppercase", border: "none", cursor: "pointer",
};

function BenefitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#3D0D16" stroke="#F5EFE6" strokeWidth="2" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}

function BenefitsList() {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
      {benefits.map((b) => (
        <li key={b} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#2A2520", marginBottom: "10px" }}>
          <BenefitIcon />{b}
        </li>
      ))}
    </ul>
  );
}

function parseOtpError(err: unknown): string {
  const msg = (err as { message?: string }).message ?? "";
  if (msg.includes("Invalid OTP") || msg.includes("invalid")) return "Invalid OTP. Please check and try again.";
  if (msg.includes("expired")) return "OTP expired. Please request a new code.";
  if (msg.includes("too many") || msg.includes("limit")) return "Too many attempts. Please try again later.";
  return msg || "Something went wrong. Please try again.";
}


export default function AccountDrawer() {
  const { isAccountDrawerOpen, setAccountDrawerOpen, setCustomer } = useStore();
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginOtpMessage, setLoginOtpMessage] = useState("");

  const [signupFirst, setSignupFirst] = useState("");
  const [signupLast, setSignupLast] = useState("");
  const [signupIdentifier, setSignupIdentifier] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const [signupNewsletter, setSignupNewsletter] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupOtpMessage, setSignupOtpMessage] = useState("");

  if (!isAccountDrawerOpen) return null;

  async function handleLoginSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      if (!loginOtpSent) {
        await sendPhoneOTP(loginIdentifier);
        setLoginOtpSent(true);
        setLoginOtpMessage(`OTP sent — check the Medusa backend terminal for the code.`);
      } else {
        const customer = await verifyPhoneOTP(loginIdentifier, loginOtp);
        setCustomer({
          id: customer.id,
          email: customer.email,
          phone: customer.phone ?? loginIdentifier,
          firstName: customer.firstName ?? "",
          lastName: customer.lastName ?? "",
        });
        setAccountDrawerOpen(false);
        router.push("/account");
      }
    } catch (err: unknown) {
      setLoginError(parseOtpError(err));
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignupSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSignupError("");
    setSignupLoading(true);
    try {
      if (!signupOtpSent) {
        await sendPhoneOTP(signupIdentifier, signupFirst, signupLast);
        setSignupOtpSent(true);
        setSignupOtpMessage(`OTP sent — check the Medusa backend terminal for the code.`);
      } else {
        const customer = await verifyPhoneOTP(signupIdentifier, signupOtp, signupFirst, signupLast);
        setCustomer({
          id: customer.id,
          email: customer.email,
          phone: customer.phone ?? signupIdentifier,
          firstName: customer.firstName ?? signupFirst,
          lastName: customer.lastName ?? signupLast,
        });
        setAccountDrawerOpen(false);
        router.push("/account");
      }
    } catch (err: unknown) {
      setSignupError(parseOtpError(err));
    } finally {
      setSignupLoading(false);
    }
  }

  async function handleLoginResend() {
    setLoginError("");
    setLoginLoading(true);
    try {
      await sendPhoneOTP(loginIdentifier);
      setLoginOtpMessage(`OTP resent to ${loginIdentifier}. Check your messages (including spam).`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setLoginError(parseOtpError(code));
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignupResend() {
    setSignupError("");
    setSignupLoading(true);
    try {
      await sendPhoneOTP(signupIdentifier);
      setSignupOtpMessage(`OTP resent to ${signupIdentifier}. Check your messages (including spam).`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setSignupError(parseOtpError(code));
    } finally {
      setSignupLoading(false);
    }
  }

  function switchToSignup() {
    setIsSignup(true);
    setLoginOtpSent(false);
    setLoginOtp("");
  }

  function switchToLogin() {
    setIsSignup(false);
    setSignupOtpSent(false);
    setSignupOtp("");
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[10000]"
        style={{ background: "rgba(26,20,16,0.4)" }}
        onClick={() => setAccountDrawerOpen(false)}
      />

      <div
        className="fixed right-0 top-0 h-full flex flex-col z-[10001]"
        style={{ width: "420px", maxWidth: "100vw", background: "#F5EFE6", boxShadow: "-10px 0 40px rgba(0,0,0,0.1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: "24px 30px", borderBottom: "1px solid rgba(201,168,76,0.3)" }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "18px", letterSpacing: "4px", color: "#2A080F" }}>
            ACCOUNT
          </span>
          <button onClick={() => setAccountDrawerOpen(false)} aria-label="Close" style={{ color: "#2A080F", background: "none", border: "none", cursor: "pointer" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
          {!isSignup ? (
            /* ── LOGIN VIEW ── */
            <>
              <form onSubmit={handleLoginSubmit} style={{ marginBottom: "30px" }}>
                <div style={{ marginBottom: "18px" }}>
                  <input
                    type="text"
                    placeholder="Phone Number (e.g. +1234567890)"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                    disabled={loginOtpSent}
                    style={inputStyle}
                  />
                </div>
                {loginOtpSent && (
                  <div style={{ marginBottom: "18px" }}>
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={loginOtp}
                      onChange={(e) => setLoginOtp(e.target.value)}
                      maxLength={6}
                      style={inputStyle}
                    />
                    {loginOtpMessage && (
                      <small style={{ fontSize: "12px", color: "#2e7d32", display: "block", marginTop: "8px", fontStyle: "italic" }}>
                        {loginOtpMessage}
                      </small>
                    )}
                    <button type="button" onClick={handleLoginResend} disabled={loginLoading} style={{ fontSize: "12px", color: "#3D0D16", background: "none", border: "none", padding: "6px 0 0", cursor: "pointer", textDecoration: "underline" }}>
                      Didn&apos;t receive it? Resend OTP
                    </button>
                  </div>
                )}
                {loginError && <p style={{ fontSize: "12px", color: "#c0392b", marginBottom: "12px" }}>{loginError}</p>}
                <button type="submit" style={btnStyle} disabled={loginLoading}>
                  {loginLoading ? "PLEASE WAIT…" : loginOtpSent ? "VERIFY OTP" : "SEND OTP"}
                </button>
              </form>

              <div style={{ borderTop: "1px solid rgba(201,168,76,0.3)", paddingTop: "30px" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "2.5px", marginBottom: "14px", color: "#1A1410", textTransform: "uppercase" }}>
                  DON&apos;T HAVE AN ACCOUNT?
                </h3>
                <p style={{ fontSize: "13px", color: "#2A2520", marginBottom: "18px", lineHeight: 1.55, fontFamily: "var(--font-heading)", fontStyle: "italic" }}>
                  Create an account to unlock a world of benefits and rewards:
                </p>
                <BenefitsList />
                <button onClick={switchToSignup} style={btnStyle}>CREATE ACCOUNT</button>
              </div>
            </>
          ) : (
            /* ── SIGNUP VIEW ── */
            <>
              <p style={{ fontSize: "13px", color: "#2A2520", marginBottom: "18px", lineHeight: 1.55, fontFamily: "var(--font-heading)", fontStyle: "italic" }}>
                Create an account to unlock a world of benefits and rewards:
              </p>
              <BenefitsList />

              <form onSubmit={handleSignupSubmit}>
                <div style={{ marginBottom: "18px" }}>
                  <input type="text" placeholder="First name" value={signupFirst} onChange={(e) => setSignupFirst(e.target.value)} required disabled={signupOtpSent} style={inputStyle} />
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <input type="text" placeholder="Last name" value={signupLast} onChange={(e) => setSignupLast(e.target.value)} required disabled={signupOtpSent} style={inputStyle} />
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <input type="text" placeholder="Phone Number (e.g. +1234567890)" value={signupIdentifier} onChange={(e) => setSignupIdentifier(e.target.value)} required disabled={signupOtpSent} style={inputStyle} />
                </div>
                {signupOtpSent && (
                  <div style={{ marginBottom: "18px" }}>
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={signupOtp}
                      onChange={(e) => setSignupOtp(e.target.value)}
                      maxLength={6}
                      style={inputStyle}
                    />
                    {signupOtpMessage && (
                      <small style={{ fontSize: "12px", color: "#2e7d32", display: "block", marginTop: "8px", fontStyle: "italic" }}>
                        {signupOtpMessage}
                      </small>
                    )}
                    <button type="button" onClick={handleSignupResend} disabled={signupLoading} style={{ fontSize: "12px", color: "#3D0D16", background: "none", border: "none", padding: "6px 0 0", cursor: "pointer", textDecoration: "underline" }}>
                      Didn&apos;t receive it? Resend OTP
                    </button>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px", fontSize: "13px", color: "#2A2520" }}>
                  <input type="checkbox" id="signup-newsletter" checked={signupNewsletter} onChange={(e) => setSignupNewsletter(e.target.checked)} style={{ width: "14px", height: "14px", accentColor: "#3D0D16", cursor: "pointer" }} />
                  <label htmlFor="signup-newsletter">Register to our newsletter</label>
                </div>
                {signupError && <p style={{ fontSize: "12px", color: "#c0392b", marginBottom: "12px" }}>{signupError}</p>}
                <button type="submit" style={btnStyle} disabled={signupLoading}>
                  {signupLoading ? "PLEASE WAIT…" : signupOtpSent ? "VERIFY OTP" : "SEND OTP"}
                </button>
              </form>

              <div style={{ marginTop: "22px", fontSize: "13px", color: "#2A2520", textAlign: "center" }}>
                Already have an account?{" "}
                <button onClick={switchToLogin} style={{ color: "#3D0D16", fontWeight: 600, textDecoration: "underline", padding: 0, background: "none", border: "none", fontSize: "13px", cursor: "pointer" }}>
                  Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
