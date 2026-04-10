import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Notify] Config:', {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
});

let _client = null;
function getClient() {
  if (!_client && SUPABASE_URL && SUPABASE_ANON_KEY) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

function getClinicId() {
  try {
    return JSON.parse(localStorage.getItem('cp_user') || '{}')?.clinic_id || null;
  } catch { return null; }
}

// Persistent broadcast channel so it doesn't get GC'd
let _broadcastChannel = null;
function getBroadcastChannel() {
  const clinicId = getClinicId();
  if (!clinicId) return null;
  const client = getClient();
  if (!client) return null;
  const channelName = `clinic-queue-${clinicId}`;
  if (!_broadcastChannel) {
    _broadcastChannel = client.channel(channelName);
    _broadcastChannel.subscribe((status) => {
      console.log('[Notify] Broadcast channel status:', status);
    });
  }
  return _broadcastChannel;
}

// Same-device tab sync
const bc = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('clinicping_queue')
  : null;

// ── Audio unlock (call on first user interaction) ─────────────────────────────
export function unlockAudio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    // Play a silent buffer — tricks mobile browsers into unlocking audio
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    ctx.resume();
    console.log('[Notify] Audio unlocked, state:', ctx.state);
  } catch (e) {
    console.warn('[Notify] Audio unlock failed:', e.message);
  }
}

// ── Play notification ping ────────────────────────────────────────────────────
export function playPing() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    // Create fresh context each time — most reliable on mobile
    const ctx = new AudioCtx();

    const play = () => {
      [880, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.35);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play);
    } else {
      play();
    }
  } catch (e) {
    console.warn('[Notify] Audio ping failed:', e.message);
  }
}

// ── Broadcast update (called from Doctor) ────────────────────────────────────
export function broadcastQueueUpdate(data) {
  const clinicId = data.clinic_id || getClinicId();
  const payload = { ...data, clinic_id: clinicId };

  // Same device/browser
  if (bc) {
    bc.postMessage(payload);
    console.log('[Notify] BroadcastChannel sent', payload);
  }

  // Cross-device
  const ch = getBroadcastChannel();
  if (!ch) {
    console.warn('[Notify] No broadcast channel available');
    return;
  }

  ch.send({
    type: 'broadcast',
    event: 'queue_update',
    payload,
  }).then(() => {
    console.log('[Notify] Realtime sent ✓');
  }).catch(e => {
    console.warn('[Notify] Realtime send failed:', e.message);
  });
}

// ── Listen for updates (called from Queue/receptionist) ───────────────────────
export function onQueueUpdate(callback) {
  const unsubs = [];

  // Same device
  if (bc) {
    const handler = (e) => {
      console.log('[Notify] BroadcastChannel received', e.data);
      callback(e.data);
    };
    bc.addEventListener('message', handler);
    unsubs.push(() => bc.removeEventListener('message', handler));
  }

  // Cross-device
  const client = getClient();
  const clinicId = getClinicId();

  if (!client || !clinicId) {
    console.warn('[Notify] Realtime listener not set up — missing client or clinicId');
    return () => unsubs.forEach(fn => fn());
  }

  const channelName = `clinic-queue-${clinicId}`;
  console.log('[Notify] Listening on channel:', channelName);

  const ch = client
    .channel(channelName)
    .on('broadcast', { event: 'queue_update' }, ({ payload }) => {
      console.log('[Notify] Realtime received ✓', payload);
      playPing();
      callback(payload);
    })
    .subscribe((status) => {
      console.log('[Notify] Listener subscription:', status);
    });

  unsubs.push(() => ch.unsubscribe());

  return () => unsubs.forEach(fn => fn());
}
