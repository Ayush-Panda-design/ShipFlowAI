-- AlterTable
ALTER TABLE "subscription" ADD COLUMN "razorpayPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "subscription_razorpayPaymentId_key" ON "subscription"("razorpayPaymentId");
