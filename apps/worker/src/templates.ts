/** Türkçe e-posta şablonları: her e-posta düz metin + HTML. Kullanıcı verisi HTML'e kaçışlanarak girer. */
import { brand } from "@avrupadasat/core/brand.config";

export interface Mail {
  subject: string;
  text: string;
  html: string;
}

export function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

interface Block {
  title: string;
  paragraphs: string[];
  button?: { label: string; href: string };
  note?: string;
}

function layout(subject: string, b: Block): Mail {
  const text = [
    b.title,
    "",
    ...b.paragraphs,
    ...(b.button ? ["", `${b.button.label}: ${b.button.href}`] : []),
    ...(b.note ? ["", b.note] : []),
    "",
    "—",
    `${brand.name} · ${brand.contact.email}`,
    brand.independenceNotice,
  ].join("\n");
  const html = `<!doctype html><html lang="tr"><body style="margin:0;background:#f5f7fb;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#0b1324">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e5e8ef;border-radius:14px">
<tr><td style="padding:22px 26px 0"><span style="display:inline-block;background:#c8102e;color:#fff;font-weight:800;border-radius:8px;padding:6px 8px;font-size:12px">${esc(brand.monogram)}</span>
<b style="font-size:17px;margin-left:8px">${esc(brand.nameParts[0])}<span style="color:#c8102e">${esc(brand.nameParts[1])}</span></b></td></tr>
<tr><td style="padding:18px 26px 6px"><h1 style="font-size:20px;margin:0 0 12px">${esc(b.title)}</h1>
${b.paragraphs.map((p) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${esc(p)}</p>`).join("")}
${b.button ? `<p style="margin:18px 0"><a href="${esc(b.button.href)}" style="background:#c8102e;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;display:inline-block">${esc(b.button.label)}</a></p>` : ""}
${b.note ? `<p style="font-size:13px;color:#5b6478;margin:12px 0">${esc(b.note)}</p>` : ""}
</td></tr>
<tr><td style="padding:14px 26px 22px;border-top:1px solid #e5e8ef;font-size:12px;color:#5b6478">${esc(brand.name)} · ${esc(brand.contact.email)}<br>${esc(brand.independenceNotice)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

export const templates = {
  invite: (link: string) =>
    layout("Müşteri panelinize davet edildiniz", {
      title: "Panelinize hoş geldiniz",
      paragraphs: [
        "Avrupadasat müşteri paneline davet edildiniz. Aşağıdaki bağlantıdan şifrenizi belirleyerek giriş yapabilirsiniz.",
      ],
      button: { label: "Şifremi belirle", href: link },
      note: "Bağlantı 72 saat geçerlidir ve yalnız bir kez kullanılabilir. Bu daveti beklemiyorsanız e-postayı yok sayın.",
    }),
  reset: (link: string) =>
    layout("Şifre sıfırlama bağlantınız", {
      title: "Şifrenizi sıfırlayın",
      paragraphs: ["Hesabınız için şifre sıfırlama istendi."],
      button: { label: "Yeni şifre belirle", href: link },
      note: "Bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız e-postayı yok sayın; şifreniz değişmez.",
    }),
  quote: (number: string, link: string) =>
    layout(`Teklifiniz hazır: ${number}`, {
      title: "Teklifiniz hazır",
      paragraphs: [
        `${number} numaralı teklifinizi aşağıdaki bağlantıdan inceleyebilir, PDF olarak indirebilir ve çevrimiçi onaylayabilirsiniz.`,
      ],
      button: { label: "Teklifi görüntüle", href: link },
      note: "Bu bağlantı size özeldir; lütfen başkalarıyla paylaşmayın.",
    }),
  leadReceived: (company: string) =>
    layout("Talebiniz alındı", {
      title: "Uygunluk raporu talebiniz alındı",
      paragraphs: [
        `Merhaba, ${company} için Avrupa uygunluk raporu talebinizi aldık. Raporunuz 48 saat içinde bu e-posta adresine gönderilecek.`,
        "Sorunuz olursa bu e-postayı yanıtlayabilirsiniz.",
      ],
    }),
  registration: (stepLabel: string, statusLabel: string, note: string | undefined, panel: string) =>
    layout(`Kayıt adımı güncellendi: ${stepLabel}`, {
      title: "Şirket kuruluşu güncellemesi",
      paragraphs: [`${stepLabel}: ${statusLabel}.`, ...(note ? [`Not: ${note}`] : [])],
      button: { label: "Panelde görüntüle", href: panel },
    }),
  shipment: (stageLabel: string, panel: string) =>
    layout(`Sevkiyat güncellemesi: ${stageLabel}`, {
      title: "Sevkiyatınızda yeni aşama",
      paragraphs: [`Sevkiyatınız şu aşamaya geldi: ${stageLabel}.`],
      button: { label: "Sevkiyatı görüntüle", href: panel },
    }),
  invoice: (number: string, gross: string, panel: string) =>
    layout(`Yeni fatura: ${number}`, {
      title: "Faturanız kesildi",
      paragraphs: [
        `${number} numaralı faturanız oluşturuldu. Toplam: ${gross}.`,
        "Faturayı panelinizden PDF olarak indirebilirsiniz.",
      ],
      button: { label: "Faturalarım", href: panel },
    }),
  ops: (subject: string, lines: string[], panel: string) =>
    layout(`[Ekip] ${subject}`, {
      title: subject,
      paragraphs: lines,
      button: { label: "Ekip paneli", href: panel },
    }),
};
