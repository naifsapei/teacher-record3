const LOCAL_USERS = [
  {
    id: "local-admin",
    email: "admin@teacher-record.local",
    password: "admin123",
    role: "admin",
    app_role: "teacher",
    full_name: "مدير النظام",
    display_name: "مدير النظام",
    title: "مدير",
    account_type: "admin",
    subscription_plan: "admin",
    subscription_status: "admin",
    phone: "0500000000",
    specialization: "اللغة العربية",
  },
  {
    id: "local-teacher",
    email: "teacher@teacher-record.local",
    password: "teacher123",
    role: "user",
    app_role: "teacher",
    full_name: "أحمد محمد",
    display_name: "أحمد محمد",
    title: "معلم",
    account_type: "subscriber",
    subscription_plan: "year",
    subscription_status: "active",
    phone: "0501234567",
    specialization: "الرياضيات",
  },
];

const STORAGE_KEY = "teacher_record_local_auth";

export function getLocalAuthUser(email, password) {
  const user = LOCAL_USERS.find((candidate) => candidate.email.toLowerCase() === String(email || "").trim().toLowerCase());
  if (!user) return null;
  if (user.password !== String(password || "")) return null;
  return user;
}

export function persistLocalAuthUser(user) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage errors
  }
}

export function getPersistedLocalAuthUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearLocalAuthUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
