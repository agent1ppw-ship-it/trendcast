const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://trendcast.io';

class ApiClient {
  baseUrl: string;

  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `API request failed (${response.status})`);
    }

    return (await response.json()) as T;
  }
}

export const api = new ApiClient();
