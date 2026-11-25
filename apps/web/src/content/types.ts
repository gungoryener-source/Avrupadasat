export interface Section {
  h2: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Numaralı adımlar */
  steps?: { title: string; text: string }[];
  table?: { head: string[]; rows: string[][] };
  note?: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface ContentPage {
  slug: string;
  /** <title> — 60 karakter civarı */
  title: string;
  /** meta description — 150–160 karakter */
  description: string;
  kicker: string;
  h1: string;
  intro: string;
  sections: Section[];
  faq?: Faq[];
  cta?: { title: string; text: string };
  /** Schema.org türü */
  schema: "Service" | "Article" | "WebPage";
  /** İçerikte doğrulanması gereken bilgi varsa ekip için not (sayfada gösterilmez) */
  verify?: string[];
  updated: string;
}
