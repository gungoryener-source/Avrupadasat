import { requireClient } from "@/server/session";

export default async function PanelHome() {
  const s = await requireClient();
  return (
    <>
      <h1>Hoş geldiniz, {s.name.split(" ")[0]}</h1>
      <p className="muted">Panel içerikleri Aşama 3&apos;te genişletilecek.</p>
    </>
  );
}
