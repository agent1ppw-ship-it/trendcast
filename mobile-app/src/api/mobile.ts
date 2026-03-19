import type {
  AppleAuthInput,
  AuthSession,
  BusinessLead,
  DirectMailData,
  Lead,
  MailSenderProfile,
  OrganizationSummary,
  TrendcastUser,
} from './types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://trendcast.io';

async function request<T>(path: string, options?: {
  method?: 'GET' | 'POST' | 'PATCH';
  token?: string;
  body?: unknown;
}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function mobileLogin(email: string, password: string): Promise<AuthSession> {
  const response = await request<{
    success: boolean;
    token: string;
    user: TrendcastUser;
    organization: OrganizationSummary;
  }>('/api/mobile/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  return {
    token: response.token,
    user: response.user,
    organization: response.organization,
  };
}

export async function mobileGoogleLogin(idToken: string): Promise<AuthSession> {
  const response = await request<{
    success: boolean;
    token: string;
    user: TrendcastUser;
    organization: OrganizationSummary;
  }>('/api/mobile/auth/google', {
    method: 'POST',
    body: { idToken },
  });

  return {
    token: response.token,
    user: response.user,
    organization: response.organization,
  };
}

export async function mobileAppleLogin(input: AppleAuthInput): Promise<AuthSession> {
  const response = await request<{
    success: boolean;
    token: string;
    user: TrendcastUser;
    organization: OrganizationSummary;
  }>('/api/mobile/auth/apple', {
    method: 'POST',
    body: input,
  });

  return {
    token: response.token,
    user: response.user,
    organization: response.organization,
  };
}

export async function mobileMe(token: string) {
  return await request<{
    success: boolean;
    user: TrendcastUser;
    organization: OrganizationSummary;
  }>('/api/mobile/me', { token });
}

export async function mobileGetLeads(token: string, limit = 75) {
  return await request<{ success: boolean; leads: Lead[] }>(`/api/mobile/leads?limit=${limit}`, { token });
}

export async function mobileCreateLead(token: string, input: {
  name: string;
  phone?: string;
  address?: string;
  source?: string;
}) {
  return await request<{ success: boolean; lead: Lead }>('/api/mobile/leads', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function mobileUpdateLeadStatus(token: string, leadId: string, status: string) {
  return await request<{ success: boolean }>(`/api/mobile/leads/${leadId}`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

export async function mobileStartBusinessSearch(token: string, input: {
  zipCode: string;
  industry: string;
  batchSize?: number;
  radiusMiles?: number;
}) {
  return await request<{ success: boolean; jobId: string }>('/api/mobile/business-finder/search', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function mobileGetBusinessSearchStatus(token: string, jobId: string) {
  return await request<{
    success: boolean;
    state: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed' | 'prioritized';
    progress?: { phase: string; percent: number };
    results?: BusinessLead[];
    sourceLabel?: string;
    matchStrategy?: string;
    blocked?: boolean;
    blockReason?: string;
  }>(`/api/mobile/business-finder/search/${jobId}`, { token });
}

export async function mobileGetDirectMailData(token: string) {
  return await request<DirectMailData>('/api/mobile/direct-mail', { token });
}

export async function mobileSaveSenderProfile(token: string, profile: MailSenderProfile) {
  return await request<{ success: boolean }>('/api/mobile/direct-mail/sender-profile', {
    method: 'POST',
    token,
    body: profile,
  });
}

export async function mobileCreateMailCampaign(token: string, input: {
  name: string;
  templateId: string;
  leadIds: string[];
  scheduledAt?: string | null;
  postageClass?: 'MARKETING' | 'FIRST_CLASS';
}) {
  return await request<{ success: boolean; campaignId: string }>('/api/mobile/direct-mail/campaigns', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function mobileSendMailCampaign(token: string, campaignId: string) {
  return await request<{
    success: boolean;
    requiresCheckout?: boolean;
    checkoutUrl?: string | null;
    message?: string;
    error?: string;
  }>(`/api/mobile/direct-mail/campaigns/${campaignId}/send`, {
    method: 'POST',
    token,
  });
}

export async function mobileCancelMailCampaign(token: string, campaignId: string) {
  return await request<{ success: boolean }>(`/api/mobile/direct-mail/campaigns/${campaignId}/cancel`, {
    method: 'POST',
    token,
  });
}
