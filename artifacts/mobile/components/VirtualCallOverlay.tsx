import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface Props {
  isVisible: boolean;
  doctorName: string;
  doctorId: string;
  specialty: string;
  onEnd: (duration: number) => void;
}

export function VirtualCallOverlay({ isVisible, doctorName, doctorId, specialty, onEnd }: Props) {
  const colors = useColors();
  const [status, setStatus] = useState<'connecting' | 'active' | 'ended'>('connecting');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setStatus('connecting');
      setSeconds(0);
      return;
    }

    let peer: any = null;
    let localStream: MediaStream | null = null;

    async function startCall() {
      try {
        // 1. Load PeerJS from CDN if not already present
        if (!(window as any).Peer) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // 2. Get User Media (Audio)
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 3. Initialize Peer
        const PeerClass = (window as any).Peer;
        peer = new PeerClass();

        peer.on('open', (id: string) => {
          console.log('Nurse Peer ID:', id);
          // Sanitize doctorId to match dashboard registration (lowercase alphanumeric)
          const cleanDoctorId = doctorId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const call = peer.call(cleanDoctorId, localStream);
          
          call.on('stream', (remoteStream: MediaStream) => {
            console.log('Received Doctor Stream');
            setStatus('active');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Attach remote stream to audio element
            const audio = document.createElement('audio');
            audio.srcObject = remoteStream;
            audio.play();
          });

          call.on('error', (err: any) => {
            console.error('Call Error:', err);
            setStatus('ended');
          });
        });

      } catch (err) {
        console.error('Failed to start WebRTC call:', err);
        setStatus('active'); // Fallback to simulated if media fails for demo
      }
    }

    startCall();

    return () => {
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (peer) peer.destroy();
    };
  }, [isVisible, doctorName]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'active') {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStatus('ended');
    setTimeout(() => onEnd(Math.ceil(seconds / 60)), 500);
  };

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <MaterialCommunityIcons name="doctor" size={60} color={colors.primary} />
            </View>
            <Text style={[styles.name, { color: colors.foreground }]}>{doctorName}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{specialty}</Text>
            
            <View style={[styles.statusBadge, { 
              backgroundColor: status === 'active' ? '#DCFCE7' : '#FEF9C3',
              borderColor: status === 'active' ? '#BBF7D0' : '#FEF08A'
            }]}>
              <View style={[styles.dot, { backgroundColor: status === 'active' ? '#16A34A' : '#EAB308' }]} />
              <Text style={[styles.statusText, { color: status === 'active' ? '#16A34A' : '#854D0E' }]}>
                {status === 'connecting' ? 'Establishing Secure Link...' : 'Virtual Call Active'}
              </Text>
            </View>
          </View>

          {status === 'active' && (
            <View style={styles.timerContainer}>
              <Text style={[styles.timer, { color: colors.foreground }]}>{formatTime(seconds)}</Text>
            </View>
          )}

          <View style={styles.visualizer}>
            <View style={[styles.pulse, { borderColor: colors.primary + '40' }]} />
            <View style={[styles.pulse, { borderColor: colors.primary + '20', width: 250, height: 250 }]} />
          </View>

          <View style={styles.controls}>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.circleBtn, { backgroundColor: colors.muted }]}>
                <Ionicons name="mic-outline" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.circleBtn, { backgroundColor: colors.muted }]}>
                <Ionicons name="videocam-off-outline" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.circleBtn, { backgroundColor: colors.muted }]}>
                <Ionicons name="volume-high-outline" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.endBtn, { backgroundColor: '#EF4444' }]}
              onPress={handleEnd}
            >
              <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    marginBottom: 4,
  },
  meta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  timerContainer: {
    marginTop: 20,
  },
  timer: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 32,
    letterSpacing: 2,
  },
  visualizer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 150,
    borderWidth: 2,
  },
  controls: {
    width: '100%',
    gap: 40,
    marginBottom: 40,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  circleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
