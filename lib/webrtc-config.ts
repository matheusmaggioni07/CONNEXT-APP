export const rtcConfig: RTCConfiguration = {
  // ICE servers are fetched dynamically in setupWebRTC()
  iceServers: [],
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
