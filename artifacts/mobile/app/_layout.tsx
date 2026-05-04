import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CaseProvider } from "@/contexts/CaseContext";
import { CallProvider } from "@/contexts/CallContext";
import { CallOverlay } from "@/components/CallOverlay";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

import { useRouter, useSegments } from 'expo-router';
import { useCases } from "@/contexts/CaseContext";

function RootLayoutNav() {
  const { profile, loading } = useCases();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Hide splash screen once syncing is complete
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === 'login';

    if (!profile && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (profile && inAuthGroup) {
      // Redirect to home if authenticated and on login screen
      router.replace('/(tabs)');
    }
  }, [profile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFCFB' }}>
        <View style={{ 
          backgroundColor: 'white', 
          padding: 25, 
          borderRadius: 24, 
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 4,
          marginBottom: 32,
          borderWidth: 1,
          borderColor: '#F0EBE6'
        }}>
          <Image 
            source={require('@/assets/images/logo.png')} 
            style={{ width: 140, height: 50 }} 
            resizeMode="contain" 
          />
        </View>
        <ActivityIndicator size="small" color="#F5621E" />
        <Text style={{ marginTop: 16, fontSize: 11, letterSpacing: 1.2, color: '#A09890', fontWeight: '600', textTransform: 'uppercase' }}>
          Syncing Clinical Data...
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="case/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="case/pcr/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="case/refusal/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

import { View, ActivityIndicator, Image, Text } from 'react-native';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Note: SplashScreen hiding is now handled in RootLayoutNav after data syncing
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <CaseProvider>
            <CallProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                  <CallOverlay />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </CallProvider>
          </CaseProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
