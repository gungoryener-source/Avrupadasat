// Tüm uçtan uca testleri sırayla çalıştırır. Önkoşul: E2E_BASE adresinde çalışan sunucu,
// test GTM/Meta kimlikleriyle derlenmiş olmalı (Aşama 2 onay testi için), DATABASE_URL tanımlı.
import { execFileSync, spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
execFileSync("pnpm", ["-s", "db:seed"], { cwd: root, stdio: "inherit" });
execFileSync("pnpm", ["-s", "--filter", "@avrupadasat/db", "seed:e2e"], {
  cwd: root,
  stdio: "ignore",
});
let failed = 0;
for (const phase of [1, 2, 3, 4, 5]) {
  console.log(`\n══════ Aşama ${phase} ══════`);
  const r = spawnSync("node", [`e2e/phase${phase}.mjs`], {
    cwd: root,
    stdio: "inherit",
    timeout: 600_000,
  });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} aşama BAŞARISIZ` : "\nTüm uçtan uca testler GEÇTİ");
process.exit(failed ? 1 : 0);
