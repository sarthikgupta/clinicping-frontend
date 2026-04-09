// Shared broadcast channel between Doctor and Queue tabs
// Works across browser tabs on the same device with zero server changes

const CHANNEL_NAME = 'clinicping_queue';

let channel = null;

function getChannel() {
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

// Send a notification to all other tabs
export function broadcastQueueUpdate(payload) {
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: 'QUEUE_UPDATE', ...payload, ts: Date.now() });
  }
}

// Listen for queue updates from other tabs
export function onQueueUpdate(callback) {
  const ch = getChannel();
  if (!ch) return () => {};
  const handler = (event) => {
    if (event.data?.type === 'QUEUE_UPDATE') {
      callback(event.data);
    }
  };
  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}

// Play a soft ping sound using Web Audio API — no file needed
export function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // First tone — higher
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    // Second tone — lower, slight delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 660;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
    gain2.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.6);

    // Close context after done
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {
    console.warn('Audio ping failed:', e);
  }
}
