export async function sendPhoneOTP(phone: string, firstName?: string, lastName?: string): Promise<void> {
  const res = await fetch("/api/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: phone, firstName, lastName }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Failed to send OTP");
}

export async function verifyPhoneOTP(
  phone: string,
  otp: string,
  firstName?: string,
  lastName?: string
): Promise<{ id: string; email: string; phone: string; firstName: string; lastName: string }> {
  const res = await fetch("/api/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: phone, otp, firstName, lastName }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Invalid OTP");
  return data.customer;
}
