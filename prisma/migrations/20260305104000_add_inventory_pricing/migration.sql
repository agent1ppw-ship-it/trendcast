-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryPricing" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "sku" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryPricing_orgId_category_idx" ON "InventoryPricing"("orgId", "category");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryPricing_orgId_sku_key" ON "InventoryPricing"("orgId", "sku");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryPricing_orgId_fkey') THEN
        ALTER TABLE "InventoryPricing" ADD CONSTRAINT "InventoryPricing_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
