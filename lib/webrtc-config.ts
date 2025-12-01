export const rtcConfig: RTCConfiguration = {
  iceServers: [
    // Google's free STUN servers (most reliable)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Twilio STUN
    { urls: "stun:global.stun.twilio.com:3478" },
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "e8dd65b92a0c9723b4d10d04",
      credential: "1bECaWpOKjuWuB8j",
    },
    {
      urls: "turn:a.relay.metered.ca:80?transport=tcp",
      username: "e8dd65b92a0c9723b4d10d04",
      credential: "1bECaWpOKjuWuB8j",
    },
    {
      urls: "turn:a.relay.metered.ca:443",
      username: "e8dd65b92a0c9723b4d10d04",
      credential: "1bECaWpOKjuWuB8j",
    },
    {
      urls: "turn:a.relay.metered.ca:443?transport=tcp",
      username: "e8dd65b92a0c9723b4d10d04",
      credential: "1bECaWpOKjuWuB8j",
    },
    {
      urls: "turns:a.relay.metered.ca:443",
      username: "e8dd65b92a0c9723b4d10d04",
      credential: "1bECaWpOKjuWuB8j",
    },
    // OpenRelay backup
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
}

export const videoConstraints: MediaTrackConstraints = {
  width: { ideal: 1280, min: 320, max: 1920 },
  height: { ideal: 720, min: 240, max: 1080 },
  frameRate: { ideal: 30, min: 15, max: 30 },
  facingMode: "user",
}

export const audioConstraints: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: { ideal: 48000 },
  channelCount: { ideal: 1 },
}
