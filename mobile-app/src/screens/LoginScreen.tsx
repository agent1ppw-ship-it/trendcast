import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [appleSubmitting, setAppleSubmitting] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
  const hasGoogleConfig = Platform.OS === 'ios'
    ? Boolean(iosClientId || webClientId || expoClientId)
    : Platform.OS === 'android'
      ? Boolean(androidClientId || webClientId || expoClientId)
      : Boolean(webClientId || expoClientId);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    clientId: expoClientId || webClientId || 'missing-google-client-id.apps.googleusercontent.com',
    iosClientId: iosClientId || webClientId || expoClientId || 'missing-google-client-id.apps.googleusercontent.com',
    androidClientId: androidClientId || webClientId || expoClientId || 'missing-google-client-id.apps.googleusercontent.com',
    webClientId: webClientId || expoClientId || 'missing-google-client-id.apps.googleusercontent.com',
  });

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (googleResponse?.type !== 'success') return;

      const idToken =
        googleResponse.params?.id_token ||
        (googleResponse.authentication && 'idToken' in googleResponse.authentication
          ? googleResponse.authentication.idToken
          : undefined);

      if (!idToken) {
        Alert.alert('Google sign in failed', 'No ID token returned by Google.');
        setGoogleSubmitting(false);
        return;
      }

      try {
        await signInWithGoogle(idToken);
      } catch (error) {
        Alert.alert('Google sign in failed', error instanceof Error ? error.message : 'Unexpected error');
      } finally {
        setGoogleSubmitting(false);
      }
    };

    handleGoogleResponse();
  }, [googleResponse, signInWithGoogle]);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    if (!appleAvailable) {
      Alert.alert('Apple sign in unavailable', 'Apple sign-in is only available on supported iOS devices.');
      return;
    }

    setAppleSubmitting(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No Apple identity token was returned.');
      }

      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();

      await signInWithApple({
        idToken: credential.identityToken,
        email: credential.email ?? undefined,
        name: fullName || undefined,
        user: credential.user,
      });
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: string }).code) : '';
      if (code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple sign in failed', error instanceof Error ? error.message : 'Unexpected error');
      }
    } finally {
      setAppleSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (!hasGoogleConfig) {
      Alert.alert('Google config missing', 'Set EXPO_PUBLIC_GOOGLE_* client IDs in mobile-app/.env.');
      return;
    }

    if (!googleRequest) {
      Alert.alert('Google setup not ready', 'Please restart Expo after setting your environment variables.');
      return;
    }

    setGoogleSubmitting(true);
    try {
      await promptGoogleAsync();
    } catch (error) {
      setGoogleSubmitting(false);
      Alert.alert('Google sign in failed', error instanceof Error ? error.message : 'Unexpected error');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.heroCard}>
            <Text style={styles.brand}>trendcast mobile</Text>
            <Text style={styles.title}>Run your lead flow from anywhere.</Text>
            <Text style={styles.subtitle}>
              Sign in to access leads, pipeline CRM, local business search, and your account data from your phone.
            </Text>
          </View>

          <View style={styles.formCard}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#789"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#789"
              secureTextEntry
              style={styles.input}
            />

            <Pressable onPress={handleSubmit} style={[styles.button, submitting && styles.disabled]} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? 'Signing in...' : 'Sign In'}</Text>
            </Pressable>

            <Pressable
              onPress={handleGoogle}
              style={[styles.googleButton, (googleSubmitting || !hasGoogleConfig) && styles.disabled]}
              disabled={googleSubmitting || !hasGoogleConfig}
            >
              <Text style={styles.googleButtonText}>
                {googleSubmitting ? 'Connecting Google...' : hasGoogleConfig ? 'Continue with Google' : 'Google Login Not Configured'}
              </Text>
            </Pressable>

            {Platform.OS === 'ios' && (
              <Pressable
                onPress={handleApple}
                style={[styles.appleButton, (appleSubmitting || !appleAvailable) && styles.disabled]}
                disabled={appleSubmitting || !appleAvailable}
              >
                <Text style={styles.appleButtonText}>
                  {appleSubmitting ? 'Connecting Apple...' : appleAvailable ? 'Continue with Apple' : 'Apple Sign-In Unavailable'}
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.caption}>
            {hasGoogleConfig
              ? 'Google sign-in is configured for this platform.'
              : 'Add the Google OAuth client IDs in mobile-app/.env and restart Expo to enable Google sign-in.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050b14',
  },
  keyboard: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    justifyContent: 'center',
    gap: 16,
    flexGrow: 1,
  },
  heroCard: {
    gap: 10,
  },
  formCard: {
    backgroundColor: '#0b1422',
    borderColor: '#1a2940',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  brand: {
    color: '#4ade80',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: '#e5edf8',
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    color: '#8aa0bd',
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#0f1b2b',
    borderColor: '#1f2d43',
    borderWidth: 1,
    borderRadius: 12,
    color: '#e5edf8',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#4ade80',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
  },
  disabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#071020',
    fontWeight: '700',
    fontSize: 16,
  },
  googleButton: {
    marginTop: 4,
    borderColor: '#2c3f5b',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
    backgroundColor: '#0e1b2d',
  },
  googleButtonText: {
    color: '#d8e5f6',
    fontWeight: '700',
    fontSize: 15,
  },
  appleButton: {
    borderColor: '#293445',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
    backgroundColor: '#0a0d12',
  },
  appleButtonText: {
    color: '#f2f5f9',
    fontWeight: '700',
    fontSize: 15,
  },
  caption: {
    color: '#6c819f',
    fontSize: 12,
    lineHeight: 18,
  },
});
