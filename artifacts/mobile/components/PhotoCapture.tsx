import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface Props {
  label: string;
  subtitle?: string;
  uri?: string;
  onCapture: (uri: string) => void;
  disabled?: boolean;
}

export function PhotoCapture({ label, subtitle, uri, onCapture, disabled }: Props) {
  const colors = useColors();
  const [status, requestPermission] = ImagePicker.useCameraPermissions();

  const handleCapture = async () => {
    if (disabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        onCapture(result.assets[0].uri);
      }
      return;
    }

    if (!status?.granted) {
      const perm = await requestPermission();
      if (!perm.granted) {
        Alert.alert('Camera Permission Required', 'Please allow camera access to capture photos for the case log.');
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
      exif: true,
    });

    if (!result.canceled && result.assets[0]) {
      onCapture(result.assets[0].uri);
    }
  };

  const hasPhoto = !!uri;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        {hasPhoto && <Ionicons name="checkmark-circle" size={16} color="#16A34A" />}
      </View>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.captureArea,
          {
            borderColor: hasPhoto ? '#16A34A' : colors.border,
            backgroundColor: hasPhoto ? '#F0FDF4' : colors.muted,
          },
        ]}
        onPress={handleCapture}
        activeOpacity={0.75}
        disabled={disabled}
      >
        {hasPhoto ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
            <TouchableOpacity style={styles.retakeBtn} onPress={handleCapture}>
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="camera-outline" size={28} color={disabled ? colors.border : colors.primary} />
            </View>
            <Text style={[styles.captureLabel, { color: disabled ? colors.border : colors.primary }]}>
              {Platform.OS === 'web' ? 'Upload Photo' : 'Take Photo'}
            </Text>
            <Text style={[styles.captureHint, { color: colors.mutedForeground }]}>
              {Platform.OS === 'web' ? 'Select from device' : 'Camera only — no gallery'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
  },
  captureArea: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 110,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  captureHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  previewContainer: {
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 160,
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retakeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },
});
