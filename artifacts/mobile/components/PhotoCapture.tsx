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
  uris?: string[]; // New for multiple
  onCapture: (uri: string) => void;
  disabled?: boolean;
}

export function PhotoCapture({ label, subtitle, uri, uris, onCapture, disabled }: Props) {
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
      quality: 0.7,
      allowsEditing: false,
      exif: true,
    });

    if (!result.canceled && result.assets[0]) {
      onCapture(result.assets[0].uri);
    }
  };

  const currentUris = uris || (uri ? [uri] : []);
  const hasPhotos = currentUris.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        {hasPhotos && <Ionicons name="checkmark-circle" size={16} color="#16A34A" />}
      </View>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      )}

      {hasPhotos && (
        <View style={styles.thumbnailList}>
          {currentUris.map((u, i) => (
            <View key={i} style={[styles.thumbWrapper, { borderColor: colors.border }]}>
              <Image source={{ uri: u }} style={styles.thumbnail} />
            </View>
          ))}
          {!disabled && uris && (
            <TouchableOpacity 
              style={[styles.addMoreThumb, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
              onPress={handleCapture}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {!uris || !hasPhotos ? (
        <TouchableOpacity
          style={[
            styles.captureArea,
            {
              borderColor: hasPhotos ? '#16A34A' : colors.border,
              backgroundColor: hasPhotos ? '#F0FDF4' : colors.muted,
            },
          ]}
          onPress={handleCapture}
          activeOpacity={0.75}
          disabled={disabled}
        >
          {hasPhotos ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: currentUris[0] }} style={styles.preview} resizeMode="cover" />
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
      ) : null}
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
  thumbnailList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  thumbWrapper: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  addMoreThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
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
