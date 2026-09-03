/*
  Warnings:

  - Added the required column `availableAt` to the `Payout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `grossAmount` to the `Payout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformFeeAmount` to the `Payout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformFeePercent` to the `Payout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "availableAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "grossAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "platformFeeAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "platformFeePercent" DECIMAL(5,2) NOT NULL;
