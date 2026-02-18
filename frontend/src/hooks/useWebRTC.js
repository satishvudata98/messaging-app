import { useEffect, useRef, useState, useCallback } from 'react';
import {
  callUser,
  answerCall,
  sendIceCandidate,
  rejectCall,
  endCall,
  onIncomingCall,
  onCallAnswered,
  onICECandidate,
  onCallRejected,
  onCallEnded,
  getSocket,
} from '../services/socketIO';

const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
];

const TURN_SERVERS = process.env.REACT_APP_TURN_SERVERS
  ? JSON.parse(process.env.REACT_APP_TURN_SERVERS)
  : [];

export const useWebRTC = (currentUserId) => {
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const remoteUserRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [error, setError] = useState(null);

  const createPeerConnection = useCallback((offerMode = true) => {
    const iceServers = [
      { urls: STUN_SERVERS },
      ...TURN_SERVERS,
    ];

    const peerConnection = new RTCPeerConnection({
      iceServers,
    });

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      remoteStreamRef.current.addTrack(event.track);
      setRemoteStream(remoteStreamRef.current);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && remoteUserRef.current) {
        sendIceCandidate(remoteUserRef.current.id, event.candidate, callIdRef.current);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      if (
        peerConnection.connectionState === 'failed' ||
        peerConnection.connectionState === 'disconnected'
      ) {
        setError('Connection lost');
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, []);

  const startCall = useCallback(
    async (recipientUser, mediaConstraints = { audio: true, video: true }) => {
      try {
        setError(null);

        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Create peer connection
        const peerConnection = createPeerConnection(true);

        // Create and send offer
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await peerConnection.setLocalDescription(offer);

        callIdRef.current = `call-${Date.now()}`;
        remoteUserRef.current = recipientUser;

        callUser(recipientUser.id, offer, callIdRef.current);
      } catch (err) {
        setError(err.message);
        console.error('Error starting call:', err);
      }
    },
    [createPeerConnection]
  );

  const answerIncomingCall = useCallback(
    async (mediaConstraints = { audio: true, video: true }) => {
      try {
        setError(null);

        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Create peer connection if not exists
        if (!peerConnectionRef.current) {
          createPeerConnection(false);
        }

        // Set remote description
        const offer = new RTCSessionDescription(incomingCall.offer);
        await peerConnectionRef.current.setRemoteDescription(offer);

        // Create and send answer
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        answerCall(incomingCall.callId, answer, incomingCall.from.id);
        remoteUserRef.current = incomingCall.from;
        callIdRef.current = incomingCall.callId;
        setCallActive(true);
        setIncomingCall(null);
      } catch (err) {
        setError(err.message);
        console.error('Error answering call:', err);
      }
    },
    [incomingCall, createPeerConnection]
  );

  const rejectIncomingCall = useCallback(() => {
    if (incomingCall) {
      rejectCall(incomingCall.callId, incomingCall.from.id, 'User declined');
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const stopCall = useCallback(() => {
    try {
      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // End remote stream
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((track) => track.stop());
        remoteStreamRef.current = null;
        setRemoteStream(null);
      }

      // Notify peer
      if (remoteUserRef.current && callIdRef.current) {
        endCall(callIdRef.current, remoteUserRef.current.id);
      }

      callIdRef.current = null;
      remoteUserRef.current = null;
      setCallActive(false);
      setError(null);
    } catch (err) {
      console.error('Error stopping call:', err);
    }
  }, []);

  const toggleVideo = useCallback((enabled) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, []);

  const toggleAudio = useCallback((enabled) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    const unsubscribeIncoming = onIncomingCall((call) => {
      setIncomingCall(call);
    });

    const unsubscribeAnswered = onCallAnswered(async (data) => {
      try {
        if (peerConnectionRef.current) {
          const answer = new RTCSessionDescription(data.answer);
          await peerConnectionRef.current.setRemoteDescription(answer);
          setCallActive(true);
        }
      } catch (err) {
        setError(err.message);
      }
    });

    const unsubscribeICE = onICECandidate((data) => {
      if (peerConnectionRef.current) {
        const candidate = new RTCIceCandidate(data.candidate);
        peerConnectionRef.current.addIceCandidate(candidate);
      }
    });

    const unsubscribeRejected = onCallRejected((data) => {
      if (data.callId === callIdRef.current) {
        setError(data.reason);
        stopCall();
      }
    });

    const unsubscribeEnded = onCallEnded((data) => {
      if (data.callId === callIdRef.current) {
        stopCall();
      }
    });

    return () => {
      unsubscribeIncoming?.();
      unsubscribeAnswered?.();
      unsubscribeICE?.();
      unsubscribeRejected?.();
      unsubscribeEnded?.();
    };
  }, [stopCall]);

  return {
    localStream,
    remoteStream,
    callActive,
    incomingCall,
    error,
    startCall,
    answerIncomingCall,
    rejectIncomingCall,
    stopCall,
    toggleVideo,
    toggleAudio,
  };
};
