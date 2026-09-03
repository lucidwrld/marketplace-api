-- DropIndex
DROP INDEX "Order_buyerId_key";

-- DropIndex
DROP INDEX "OrderItem_orderId_key";

-- DropIndex
DROP INDEX "OrderItem_productId_key";

-- DropIndex
DROP INDEX "Payout_reference_key";

-- DropIndex
DROP INDEX "Payout_vendorId_key";

-- DropIndex
DROP INDEX "Product_vendorId_key";

-- DropIndex
DROP INDEX "Review_productId_key";

-- DropIndex
DROP INDEX "Review_userId_key";

-- AlterTable
ALTER TABLE "Payout" ALTER COLUMN "paidAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "imageUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VendorProfile" ALTER COLUMN "bankAccount" SET DATA TYPE TEXT,
ALTER COLUMN "bankCode" SET DATA TYPE TEXT;
