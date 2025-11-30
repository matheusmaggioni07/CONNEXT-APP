export const rtcConfig: RTCConfiguration = {
  iceServers: [
    // Google's free STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // Twilio STUN (more reliable)
    { urls: "stun:global.stun.twilio.com:3478" },
    // Xirsys free TURN servers
    {
      urls: [
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turns:turn.cloudflare.com:5349?transport=tcp",
      ],
      username: "connext",
      credential: "connext2025",
    },
    // OpenRelay TURN servers (free and reliable)
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
    // Metered TURN servers (backup)
    {
      urls: "turn:a.relay.metered.ca:80",
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
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
}

// Media constraints for optimal video quality
export const videoConstraints: MediaTrackConstraints = {
  width: { ideal: 1280, min: 640, max: 1920 },
  height: { ideal: 720, min: 480, max: 1080 },
  frameRate: { ideal: 30, min: 15, max: 60 },
  facingMode: "user",
}

// Audio constraints for optimal audio quality
export const audioConstraints: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
}
