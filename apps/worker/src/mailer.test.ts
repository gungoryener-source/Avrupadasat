import { SMTPServer } from "smtp-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMailer } from "./mailer";
import { templates } from "./templates";

let server: SMTPServer;
let port = 0;
const received: { to: string[]; raw: string }[] = [];

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    disabledCommands: ["STARTTLS"],
    onData(stream, session, cb) {
      let raw = "";
      stream.on("data", (d) => (raw += d.toString()));
      stream.on("end", () => {
        received.push({ to: session.envelope.rcptTo.map((r) => r.address), raw });
        cb();
      });
    },
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  port = (server.server.address() as { port: number }).port;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("e-posta gönderimi", () => {
  it("SMTP ile gerçek gönderim: konu, alıcı, düz metin ve HTML", async () => {
    const send = createMailer({
      SMTP_URL: `smtp://127.0.0.1:${port}?ignoreTLS=true`,
      MAIL_FROM: "Avrupadasat <test@avrupadasat.test>",
    });
    await send("musteri@firma.test", templates.invite("https://avrupadasat.com/sifre/TOKEN123"));
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toEqual(["musteri@firma.test"]);
    const raw = received[0]!.raw;
    expect(raw).toMatch(/Subject: =\?UTF-8\?/);
    expect(raw).toContain("multipart/alternative");
    expect(raw.replace(/=\r?\n/g, "")).toContain("TOKEN123");
  });

  it("geçersiz alıcıyı reddeder (başlık enjeksiyonu)", async () => {
    const send = createMailer({ SMTP_URL: `smtp://127.0.0.1:${port}?ignoreTLS=true` });
    await expect(
      send("a@b.co\r\nBcc: x@y.z", templates.reset("https://x/sifre/a")),
    ).rejects.toThrow();
  });

  it("üretim + canlı modda SMTP yoksa hata verir (sessiz kayıp yok); mock modda bağlantı üretimde loglanmaz", async () => {
    await expect(
      createMailer({ NODE_ENV: "production", INTEGRATIONS_MODE: "live" })(
        "a@b.co",
        templates.reset("https://x/sifre/a"),
      ),
    ).rejects.toThrow(/SMTP_URL/);
    const logs: string[] = [];
    await createMailer({ NODE_ENV: "production" }, (s) => logs.push(s))(
      "ali@firma.test",
      templates.reset("https://x/sifre/GIZLI"),
    );
    expect(logs[0]).toContain("a***@firma.test");
    expect(logs[0]).not.toContain("GIZLI");
    const dev: string[] = [];
    await createMailer({ NODE_ENV: "development" }, (s) => dev.push(s))(
      "ali@firma.test",
      templates.reset("https://x/sifre/GIZLI"),
    );
    expect(dev[0]).toContain("| https://x/sifre/GIZLI");
  });
});
