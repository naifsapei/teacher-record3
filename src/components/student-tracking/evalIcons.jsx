import {
  CheckCircle2, XCircle, Trophy, Award, BookCheck, Hand,
  Star, Heart, ThumbsUp, ThumbsDown, Lightbulb, Zap, Smile, Frown,
} from "lucide-react";

export const EVAL_CATEGORIES = {
  positive:      { label: "إيجابي",  bg: "bg-emerald-500", text: "text-emerald-600",  soft: "bg-emerald-50",  ring: "ring-emerald-500" },
  negative:      { label: "سلبي",    bg: "bg-rose-500",    text: "text-rose-600",     soft: "bg-rose-50",     ring: "ring-rose-500" },
  achievement:   { label: "إنجاز",   bg: "bg-amber-500",   text: "text-amber-600",    soft: "bg-amber-50",    ring: "ring-amber-500" },
  homework:      { label: "واجب",    bg: "bg-blue-500",    text: "text-blue-600",     soft: "bg-blue-50",     ring: "ring-blue-500" },
  participation: { label: "مشاركة",  bg: "bg-teal-500",    text: "text-teal-600",     soft: "bg-teal-50",     ring: "ring-teal-500" },
  other:         { label: "أخرى",    bg: "bg-violet-500",  text: "text-violet-600",   soft: "bg-violet-50",   ring: "ring-violet-500" },
};

export const EVAL_ICON_MAP = {
  check: CheckCircle2,
  cross: XCircle,
  trophy: Trophy,
  award: Award,
  book_check: BookCheck,
  hand: Hand,
  star: Star,
  heart: Heart,
  thumbs_up: ThumbsUp,
  thumbs_down: ThumbsDown,
  lightbulb: Lightbulb,
  zap: Zap,
  smile: Smile,
  frown: Frown,
};

export const EVAL_ICON_LABELS = {
  check: "صح",
  cross: "خطأ",
  trophy: "كأس",
  award: "وسام",
  book_check: "واجب مكتمل",
  hand: "رفع اليد",
  star: "نجمة",
  heart: "قلب",
  thumbs_up: "إعجاب",
  thumbs_down: "عدم إعجاب",
  lightbulb: "فكرة",
  zap: "نشاط",
  smile: "ابتسامة",
  frown: "عبوس",
};

export const EVAL_ICON_OPTIONS = Object.keys(EVAL_ICON_MAP);

export function getEvalIcon(key) {
  return EVAL_ICON_MAP[key] || Star;
}

export function getCategory(cat) {
  return EVAL_CATEGORIES[cat] || EVAL_CATEGORIES.other;
}