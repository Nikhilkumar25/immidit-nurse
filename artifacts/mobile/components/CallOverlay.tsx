import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useCall } from '@/contexts/CallContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

export const CallOverlay = () => {
  const { isCalling, incomingCall, localStream, remoteStream, answerCall, endCall } = useCall();
  const colors = useColors();

  if (!isCalling && !incomingCall) return null;

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        {/* Remote Video (Full Screen) */}
        {remoteStream && (
          <RTCView
            streamURL={(remoteStream as any).toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        )}

        {/* Local Video (Floating Thumbnail) */}
        {localStream && (
          <View style={styles.localVideoContainer}>
            <RTCView
              streamURL={(localStream as any).toURL()}
              style={styles.localVideo}
              objectFit="cover"
            />
          </View>
        )}

        {/* Overlay for Incoming Call */}
        {incomingCall && !isCalling && (
          <View style={styles.incomingContainer}>
            <Text style={styles.incomingTitle}>Incoming Doctor Consultation</Text>
            <Text style={styles.incomingSubtitle}>Dr. Nikhil Aggarwal is calling...</Text>
            
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.callButton, { backgroundColor: '#FF3B30' }]} 
                onPress={endCall}
              >
                <Ionicons name="close-outline" size={32} color="#FFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.callButton, { backgroundColor: '#34C759' }]} 
                onPress={answerCall}
              >
                <Ionicons name="call-outline" size={32} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Call Controls */}
        {isCalling && (
          <View style={styles.controls}>
            <TouchableOpacity 
              style={[styles.endButton, { backgroundColor: '#FF3B30' }]} 
              onPress={endCall}
            >
              <Ionicons name="call-outline" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
              <Text style={styles.endText}>End Consult</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  remoteVideo: {
    flex: 1,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#333',
  },
  localVideo: {
    flex: 1,
  },
  incomingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  incomingTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  incomingSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginBottom: 40,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 40,
  },
  callButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  endButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    gap: 12,
  },
  endText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
