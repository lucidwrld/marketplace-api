/*
  Warnings:

  - Added the required column `orderId` to the `Payout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "orderId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
