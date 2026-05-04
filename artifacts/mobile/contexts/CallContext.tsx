import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Peer, { MediaConnection } from 'peerjs';
import { mediaDevices, RTCPeerConnection, RTCView, MediaStream } from 'react-native-webrtc';
import { useCases } from './CaseContext';

interface CallContextType {
  peerId: string | null;
  isCalling: boolean;
  incomingCall: MediaConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (targetPeerId: string) => Promise<void>;
  answerCall: () => Promise<void>;
  endCall: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useCases();
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<MediaConnection | null>(null);

  useEffect(() => {
    if (profile?.id) {
      // Initialize PeerJS with the Nurse ID so it's predictable
      const peer = new Peer(`immidit-nurse-${profile.id}`, {
        host: '0.peerjs.com', // Public PeerJS server for now
        secure: true,
        port: 443
      });

      peer.on('open', (id) => {
        console.log('Peer connected with ID:', id);
        setPeerId(id);
      });

      peer.on('call', (call) => {
        console.log('Incoming call from doctor...');
        setIncomingCall(call);
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
      });

      peerRef.current = peer;

      return () => {
        peer.destroy();
      };
    }
  }, [profile]);

  const getLocalStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
          frameRate: 30,
          width: 640,
          height: 480
        }
      });
      setLocalStream(stream as any);
      return stream;
    } catch (err) {
      console.error('Failed to get local stream', err);
      return null;
    }
  };

  const startCall = async (targetPeerId: string) => {
    if (!peerRef.current) return;
    
    const stream = await getLocalStream();
    if (!stream) return;

    const call = peerRef.current.call(targetPeerId, stream as any);
    setIsCalling(true);
    currentCallRef.current = call;

    call.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream as any);
    });

    call.on('close', () => {
      endCall();
    });
  };

  const answerCall = async () => {
    if (!incomingCall) return;

    const stream = await getLocalStream();
    if (!stream) return;

    incomingCall.answer(stream as any);
    setIsCalling(true);
    currentCallRef.current = incomingCall;

    incomingCall.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream as any);
    });

    incomingCall.on('close', () => {
      endCall();
    });

    setIncomingCall(null);
  };

  const endCall = () => {
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    
    if (localStream) {
      (localStream as any).getTracks().forEach((track: any) => track.stop());
      setLocalStream(null);
    }
    
    setRemoteStream(null);
    setIsCalling(false);
    setIncomingCall(null);
  };

  return (
    <CallContext.Provider value={{
      peerId,
      isCalling,
      incomingCall,
      localStream,
      remoteStream,
      startCall,
      answerCall,
      endCall
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
