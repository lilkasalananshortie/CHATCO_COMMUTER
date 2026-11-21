import { request } from "./api-client";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface FaqGroup {
  id: string;
  label: string;
  items: FaqItem[];
}

/** Same categories and order as the web FAQ. */
const FAQ_CATEGORIES = [
  { id: "getting-started", label: "Getting Started" },
  { id: "payments", label: "Payments & GCash" },
  { id: "riding", label: "Riding & Tracking" },
  { id: "safety", label: "Safety & Support" },
  { id: "rewards", label: "Rewards & Loyalty" },
];

export async function getFaqs(): Promise<FaqItem[]> {
  const raw = await request<any[]>("/faqs");
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(item => item?.id && item?.question && item?.answer)
    .map(item => ({ id: String(item.id), question: String(item.question), answer: String(item.answer), category: String(item.category ?? "") }));
}

export function groupFaqs(items: FaqItem[], search = ""): FaqGroup[] {
  const term = search.trim().toLowerCase();
  const matches = term ? items.filter(item => `${item.question} ${item.answer}`.toLowerCase().includes(term)) : items;
  const known = new Set(FAQ_CATEGORIES.map(category => category.id));
  return [
    ...FAQ_CATEGORIES.map(category => ({ ...category, items: matches.filter(item => item.category === category.id) })),
    { id: "other", label: "More Questions", items: matches.filter(item => !known.has(item.category)) },
  ].filter(group => group.items.length > 0);
}
