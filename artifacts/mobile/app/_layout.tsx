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
import { View, ActivityIndicator, Image, Text } from 'react-native';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CaseProvider } from "@/contexts/CaseContext";

// SAFE LOAD WEBRTC: Prevents crashes on old binaries lacking native drivers
let CallProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
let CallOverlay = () => null;

try {
  // Check if native random values (required for WebRTC/PeerJS) is available
  require('react-native-get-random-values');
  const { Buffer } = require('buffer');
  global.Buffer = Buffer;
  
  // Try to load WebRTC components
  const { CallProvider: ActualCallProvider } = require("@/contexts/CallContext");
  const { CallOverlay: ActualCallOverlay } = require("@/components/CallOverlay");
  
  CallProvider = ActualCallProvider;
  CallOverlay = ActualCallOverlay;
  console.log("WebRTC Calling System: Ready (Native)");
} catch (e) {
  console.log("WebRTC Calling System: Dormant (Native drivers missing)");
}

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

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === 'login';

    if (!profile && !inAuthGroup) {
      router.replace('/login');
    } else if (profile && inAuthGroup) {
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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <CaseProvider>
            <CallProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
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
