export type TrendcastUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  orgId?: string | null;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  industry?: string;
  tier?: string;
  credits: number;
  extracts: number;
};

export type AuthSession = {
  token: string;
  user: TrendcastUser;
  organization: OrganizationSummary;
};

export type AppleAuthInput = {
  idToken: string;
  email?: string | null;
  name?: string | null;
  user?: string | null;
};

export type Lead = {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  status: string;
  source: string;
  leadScore?: number;
  createdAt?: string;
};

export type BusinessLead = {
  id: string;
  name: string;
  industry: string;
  phone: string;
  address: string;
  website?: string;
  email?: string;
  sourceLabel?: string;
};

export type MailSenderProfile = {
  mailFromName: string;
  mailFromCompany: string;
  mailAddressLine1: string;
  mailAddressLine2: string;
  mailCity: string;
  mailState: string;
  mailZip: string;
};

export type MailTemplateSummary = {
  id: string;
  name: string;
  size: string;
  type: string;
  accentColor: string;
  frontHeadline: string;
  frontBody: string;
  backHeadline?: string | null;
  backBody: string;
  ctaText?: string | null;
  isDefault: boolean;
};

export type MailCampaignSummary = {
  id: string;
  name: string;
  status: string;
  postageClass: string;
  costCents: number;
  sentCount: number;
  failedCount: number;
  stripePaymentStatus?: string | null;
  createdAt: string;
  scheduledAt?: string | null;
  orderCount: number;
  template: {
    name: string;
    size: string;
  };
};

export type DirectMailData = {
  success: boolean;
  mailMode: 'demo' | 'live';
  senderProfile: MailSenderProfile;
  leads: Lead[];
  templates: MailTemplateSummary[];
  campaigns: MailCampaignSummary[];
};
