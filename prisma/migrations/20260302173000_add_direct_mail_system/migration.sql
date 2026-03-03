CREATE TABLE "MailTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'POSTCARD',
    "size" TEXT NOT NULL DEFAULT '4X6',
    "frontHeadline" TEXT NOT NULL,
    "frontBody" TEXT NOT NULL,
    "backHeadline" TEXT,
    "backBody" TEXT NOT NULL,
    "ctaText" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#2563EB',
    "imageUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MailCampaign" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'CUSTOM',
    "targetLeadIds" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "mailType" TEXT NOT NULL DEFAULT 'POSTCARD',
    "mailSize" TEXT NOT NULL DEFAULT '4X6',
    "postageClass" TEXT NOT NULL DEFAULT 'MARKETING',
    "scheduledAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "stripeCheckoutId" TEXT,
    "stripePaymentStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MailOrder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "lobObjectId" TEXT,
    "lobTrackingId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "recipientCity" TEXT,
    "recipientState" TEXT,
    "recipientZip" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MailTrackingEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailTrackingEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AddressVerification" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "originalAddress" TEXT NOT NULL,
    "standardizedAddress" TEXT,
    "deliverable" BOOLEAN NOT NULL DEFAULT false,
    "lobId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddressVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MailTemplate_orgId_idx" ON "MailTemplate"("orgId");
CREATE INDEX "MailCampaign_orgId_idx" ON "MailCampaign"("orgId");
CREATE INDEX "MailCampaign_templateId_idx" ON "MailCampaign"("templateId");
CREATE INDEX "MailOrder_orgId_idx" ON "MailOrder"("orgId");
CREATE INDEX "MailOrder_campaignId_idx" ON "MailOrder"("campaignId");
CREATE INDEX "MailOrder_leadId_idx" ON "MailOrder"("leadId");
CREATE INDEX "MailTrackingEvent_orderId_idx" ON "MailTrackingEvent"("orderId");
CREATE INDEX "AddressVerification_leadId_idx" ON "AddressVerification"("leadId");

ALTER TABLE "MailTemplate"
    ADD CONSTRAINT "MailTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MailCampaign"
    ADD CONSTRAINT "MailCampaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MailCampaign"
    ADD CONSTRAINT "MailCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MailTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MailOrder"
    ADD CONSTRAINT "MailOrder_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MailOrder"
    ADD CONSTRAINT "MailOrder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MailCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MailOrder"
    ADD CONSTRAINT "MailOrder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MailTrackingEvent"
    ADD CONSTRAINT "MailTrackingEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MailOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AddressVerification"
    ADD CONSTRAINT "AddressVerification_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
