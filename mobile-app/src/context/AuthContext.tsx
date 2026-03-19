import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { mobileAppleLogin, mobileGoogleLogin, mobileLogin, mobileMe } from '../api/mobile';
import type { AppleAuthInput, AuthSession, OrganizationSummary, TrendcastUser } from '../api/types';

const STORAGE_KEY = 'trendcast_mobile_auth';

type AuthContextValue = {
  token: string | null;
  user: TrendcastUser | null;
  organization: OrganizationSummary | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithApple: (input: AppleAuthInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<TrendcastUser | null>(null);
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const session = JSON.parse(raw) as AuthSession;
        if (!session?.token) return;

        setToken(session.token);
        setUser(session.user);
        setOrganization(session.organization);

        try {
          const me = await mobileMe(session.token);
          setUser(me.user);
          setOrganization(me.organization);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
            token: session.token,
            user: me.user,
            organization: me.organization,
          }));
        } catch {
          setToken(null);
          setUser(null);
          setOrganization(null);
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    organization,
    loading,
    signIn: async (email: string, password: string) => {
      const session = await mobileLogin(email, password);
      setToken(session.token);
      setUser(session.user);
      setOrganization(session.organization);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    },
    signInWithGoogle: async (idToken: string) => {
      const session = await mobileGoogleLogin(idToken);
      setToken(session.token);
      setUser(session.user);
      setOrganization(session.organization);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    },
    signInWithApple: async (input: AppleAuthInput) => {
      const session = await mobileAppleLogin(input);
      setToken(session.token);
      setUser(session.user);
      setOrganization(session.organization);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    },
    signOut: async () => {
      setToken(null);
      setUser(null);
      setOrganization(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    },
    refreshMe: async () => {
      if (!token) return;
      const me = await mobileMe(token);
      setUser(me.user);
      setOrganization(me.organization);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        token,
        user: me.user,
        organization: me.organization,
      }));
    },
  }), [loading, organization, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}
