export const OTP_CHANNELS = [
  { value: "email", label: "البريد الإلكتروني", description: "ستصلك رسالة التحقق على البريد" },
  { value: "phone", label: "الجوال", description: "ستصلك رسالة التحقق على الجوال" },
];

export function normalizeOtpChannel(value) {
  return value === "phone" ? "phone" : "email";
}

export function getOtpChannelLabel(channel) {
  return normalizeOtpChannel(channel) === "phone" ? "الجوال" : "البريد الإلكتروني";
}

export function getOtpDestination(channel, email, phone) {
  return normalizeOtpChannel(channel) === "phone" ? (phone || "") : (email || "");
}
