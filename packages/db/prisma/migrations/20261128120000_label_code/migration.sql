-- Etiket kodu üreteci: "D" + 7 karakter (Crockford Base32; I, L, O, U yok — okuma hatası azalır).
-- 32^7 ≈ 34 milyar olasılık; benzersizlik ayrıca UNIQUE dizinle güvenceye alınır.
CREATE OR REPLACE FUNCTION gen_label_code() RETURNS text
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  code text := 'D';
BEGIN
  FOR i IN 1..7 LOOP
    code := code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
  END LOOP;
  RETURN code;
END
$$;

-- AlterTable (mevcut satırlar için varsayılan satır başına ayrı hesaplanır)
ALTER TABLE "StockItem" ADD COLUMN     "labelCode" TEXT NOT NULL DEFAULT gen_label_code();

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_labelCode_key" ON "StockItem"("labelCode");
