// إدارة نمط صورة/أيقونة الطالب (يُحفظ محلياً لكل جهاز)

export const BOY_AVATAR_URL =
  "https://media.base44.com/images/public/6a18d47e827f674eacf047fc/49f7bef66_Photoroom-20260716_040401.png";

export const GIRL_AVATAR_URL =
  "https://media.base44.com/images/public/6a18d47e827f674eacf047fc/bd0900f93_Photoroom-20260716_040807.png";

const STORAGE_KEY = "student_avatar_style";

export function getStudentAvatarStyle() {
  try { return localStorage.getItem(STORAGE_KEY) || "initials"; } catch { return "initials"; }
}

export function setStudentAvatarStyle(style) {
  try { localStorage.setItem(STORAGE_KEY, style); } catch { /* تجاهل */ }
}

// يحل نمط الأيقونة وفق جنس المدرسة (me.gender = male للبنين، female للبنات)
// يعيد { type: "image"|"initials", url? }
export function resolveStudentAvatar(me) {
  const style = getStudentAvatarStyle();
  const isBoys = me?.gender === "male";
  const isGirls = me?.gender === "female";
  if (style === "boy_icon" && isBoys) return { type: "image", url: BOY_AVATAR_URL };
  if (style === "girl_icon" && isGirls) return { type: "image", url: GIRL_AVATAR_URL };
  return { type: "initials" };
}