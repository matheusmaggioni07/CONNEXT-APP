export const rtcConfig: RTCConfiguration = {
  iceServers: [
    // Google's free STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // Twilio STUN (more reliable)
    { urls: "stun:global.stun.twilio.com:3478" },
    // Metered TURN servers (free tier)
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
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
}
