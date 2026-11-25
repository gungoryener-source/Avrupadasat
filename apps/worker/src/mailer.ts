/**
 * E-posta gönderimi. SMTP_URL tanımlıysa gerçek gönderim (nodemailer), değilse mock.
 * Üretimde INTEGRATIONS_MODE=live iken SMTP_URL yoksa gönderim HATA verir (olay yeniden denenir) —
 * e-postalar sessizce kaybolmaz. Mock modda bağlantılar yalnız geliştirmede konsola yazılır.
 */
import nodemailer from "nodemailer";
import type { Mail } from "./templates";

export type SendMail = (to: string, mail: Mail) => Promise<void>;

export function createMailer(
  env: NodeJS.ProcessEnv = process.env,
  log: (s: string) => void = console.info,
): SendMail {
  const from = env.MAIL_FROM ?? "Avrupadasat <merhaba@avrupadasat.com>";
  if (env.SMTP_URL) {
    const transport = nodemailer.createTransport(env.SMTP_URL);
    return async (to, mail) => {
      if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)) throw new Error("Geçersiz alıcı");
      await transport.sendMail({
        from,
        to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    };
  }
  const isProd = env.NODE_ENV === "production";
  if (isProd && env.INTEGRATIONS_MODE === "live") {
    return async () => {
      throw new Error("SMTP_URL tanımlı değil");
    };
  }
  return async (to, mail) => {
    const masked = to.replace(/^(.).*(@.*)$/, "$1***$2");
    const link = mail.text.match(/https?:\/\/\S+\/(sifre|teklif)\/\S+/)?.[0];
    // Geliştirmede bağlantı görünür (yerel test için); üretimde ASLA
    log(
      `[mock:email] ${mail.subject} → ${isProd ? masked : to}${!isProd && link ? ` | ${link}` : ""}`,
    );
  };
}
