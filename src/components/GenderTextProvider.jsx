import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { feminineTerm } from "@/lib/genderTerms";

// عناصر لا يُلامس نصها (مدخلات/سكربتات/خيارات)
const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "INPUT", "TEXTAREA", "SELECT", "OPTION", "NOSCRIPT", "TITLE",
]);

function isSkipped(node) {
  let p = node.parentNode;
  while (p && p !== document.body) {
    if (p.nodeType === 1 && (SKIP_TAGS.has(p.tagName) || p.isContentEditable === true)) return true;
    p = p.parentNode;
  }
  return false;
}

function transformTextNode(node) {
  if (node.nodeType !== 3) return;
  const val = node.nodeValue;
  if (!val || !val.trim()) return;
  if (isSkipped(node)) return;
  const next = feminineTerm(val);
  if (next !== val) node.nodeValue = next;
}

function transformSubtree(root) {
  if (!root) return;
  if (root.nodeType === 3) { transformTextNode(root); return; }
  if (root.nodeType !== 1) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (isSkipped(n)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const batch = [];
  let cur;
  while ((cur = walker.nextNode())) batch.push(cur);
  for (const n of batch) {
    const v = n.nodeValue;
    const nv = feminineTerm(v);
    if (nv !== v) n.nodeValue = nv;
  }
}

/**
 * يطبّق التأنيث الديناميكي على كل النصوص الظاهرة في التطبيق (قوائم، عناوين،
 * أزرار، جداول، نماذج، تنبيهات، تقارير) عندما يكون المسمى الوظيفي للمشترك مؤنثاً.
 * يعمل عبر MutationObserver ليتابع أي نص يُعرض ديناميكياً.
 */
export default function GenderTextProvider() {
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me().catch(() => null),
  });
  const isFemale =
    me?.gender === "female" ||
    (typeof me?.title === "string" && me.title.endsWith("ة"));
  const prevFemale = useRef(undefined);

  // عند التبديل من مؤنث إلى مذكر: يُعاد تحميل الصفحة ليعود كل النص لمصدره المذكر.
  useEffect(() => {
    if (prevFemale.current === true && isFemale === false) {
      window.location.reload();
      return;
    }
    prevFemale.current = isFemale;
  }, [isFemale]);

  useEffect(() => {
    if (!isFemale) return;
    transformSubtree(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "characterData") {
          transformTextNode(m.target);
        } else if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 3) transformTextNode(n);
            else if (n.nodeType === 1) transformSubtree(n);
          });
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [isFemale]);

  return null;
}