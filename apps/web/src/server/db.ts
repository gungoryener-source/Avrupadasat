import { getPrisma } from "@avrupadasat/db";

/** Sunucu kodunda tek giriş noktası; müşteri verisi için forTenant() ile sarılır */
export const db = () => getPrisma();
