import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useCases } from '@/contexts/CaseContext';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const [nurseId, setNurseId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useCases();
  const router = useRouter();
  const colors = useColors();

  const handleLogin = async () => {
    if (!nurseId || !passcode) {
      setError('Please enter both Nurse ID and Passcode');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await login(nurseId, passcode);
      if (user) {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('Login screen caught error:', err);
      if (err.message === 'INVALID_CREDENTIALS') {
        setError('Invalid Nurse ID or Passcode. Please check and try again.');
      } else if (err.message === 'NETWORK_TIMEOUT') {
        setError('Connection timed out. Please check your internet connection.');
      } else if (err.message === 'API_URL_MISSING') {
        setError('Configuration error: API URL is missing.');
      } else {
        setError(`Login failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style="dark" />
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={{ 
            backgroundColor: 'white', 
            padding: 22, 
            borderRadius: 20, 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: '#F2EDE9'
          }}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>immidit Nurse</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Field Operations Portal</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Nurse ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholderTextColor={colors.mutedForeground}
              placeholder="e.g. N-001"
              value={nurseId}
              onChangeText={setNurseId}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Passcode</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholderTextColor={colors.mutedForeground}
              placeholder="Enter your secret passcode"
              value={passcode}
              onChangeText={setPasscode}
              secureTextEntry
            />
          </View>

          {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Login to Dashboard</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Secure Clinical Access</Text>
          <Text style={[styles.versionText, { color: colors.mutedForeground, opacity: 0.5 }]}>v1.2.0-prod</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 200,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  versionText: {
    color: '#ccc',
    fontSize: 10,
    marginTop: 4,
  },
});
