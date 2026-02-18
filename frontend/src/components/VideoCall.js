import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../services/authContext';
import { useWebRTC } from '../hooks/useWebRTC';
import './VideoCall.css';

const VideoCall = ({ selectedUser, onClose }) => {
  const { user } = useAuth();
  const {
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
  } = useWebRTC(user?.id);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Set local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleStartCall = async () => {
    await startCall(selectedUser, { audio: true, video: true });
  };

  const handleAnswerCall = async () => {
    await answerIncomingCall({ audio: true, video: true });
  };

  const handleRejectCall = () => {
    rejectIncomingCall();
  };

  const handleStopCall = () => {
    stopCall();
    onClose();
  };

  const handleToggleVideo = () => {
    toggleVideo(!videoEnabled);
    setVideoEnabled(!videoEnabled);
  };

  const handleToggleAudio = () => {
    toggleAudio(!audioEnabled);
    setAudioEnabled(!audioEnabled);
  };

  return (
    <div className="video-call-modal-overlay">
      <div className="video-call-modal">
        <div className="video-call-header">
          <h3>
            {incomingCall ? `Call from ${incomingCall.from.username}` : `Calling ${selectedUser.username}`}
          </h3>
          {!incomingCall && !callActive && (
            <button onClick={onClose} className="close-button">✕</button>
          )}
        </div>

        {error && <div className="call-error">{error}</div>}

        <div className="video-container">
          <div className="video-stream local-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="video-element"
            />
            <label className="video-label">You</label>
          </div>

          {remoteStream && (
            <div className="video-stream remote-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="video-element"
              />
              <label className="video-label">{selectedUser.username}</label>
            </div>
          )}
        </div>

        <div className="call-controls">
          {incomingCall && !callActive ? (
            <>
              <button
                onClick={handleAnswerCall}
                className="control-button answer-button"
              >
                ✓ Answer
              </button>
              <button
                onClick={handleRejectCall}
                className="control-button reject-button"
              >
                ✕ Reject
              </button>
            </>
          ) : callActive ? (
            <>
              <button
                onClick={handleToggleVideo}
                className={`control-button ${videoEnabled ? 'active' : ''}`}
                title={videoEnabled ? 'Disable video' : 'Enable video'}
              >
                📹
              </button>
              <button
                onClick={handleToggleAudio}
                className={`control-button ${audioEnabled ? 'active' : ''}`}
                title={audioEnabled ? 'Mute' : 'Unmute'}
              >
                🎤
              </button>
              <button
                onClick={handleStopCall}
                className="control-button end-button"
              >
                End Call
              </button>
            </>
          ) : (
            <button
              onClick={handleStartCall}
              className="control-button start-button"
            >
              Start Call
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
