import "./site.css";
import { ConsentProvider } from "@/components/consent";

/** Herkese açık site: çerez onayı ve (onay sonrası) ölçüm etiketleri yalnız burada */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsentProvider
      gtmId={process.env.GTM_ID || undefined}
      pixelId={process.env.META_PIXEL_ID || undefined}
    >
      {children}
    </ConsentProvider>
  );
}
