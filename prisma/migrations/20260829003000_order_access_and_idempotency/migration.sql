-- Guest confirmation uses a hashed high-entropy access token.
-- Idempotency keys are stored hashed so duplicate checkout posts cannot create extra orders.
ALTER TABLE "Order" ADD COLUMN "accessTokenHash" TEXT;
ALTER TABLE "Order" ADD COLUMN "idempotencyKeyHash" TEXT;

CREATE UNIQUE INDEX "Order_accessTokenHash_key" ON "Order"("accessTokenHash");
CREATE UNIQUE INDEX "Order_idempotencyKeyHash_key" ON "Order"("idempotencyKeyHash");
