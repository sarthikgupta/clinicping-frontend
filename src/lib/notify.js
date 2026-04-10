import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Single shared AudioContext ────────────────────────────────────────────────
let _audioCtx = null;
let _audioUnlocked = false;

function getAudioCtx() {
  if (!_audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) _audioCtx = new AudioCtx();
  }
  return _audioCtx;
}

export function unlockAudio() {
  if (_audioUnlocked) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  // Resume suspended context
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      console.log('[Notify] AudioContext resumed, state:', ctx.state);
    });
  }

  // Play silent buffer — required for iOS Safari and some Android Chrome versions
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    _audioUnlocked = true;
    console.log('[Notify] Audio unlocked ✓ state:', ctx.state);
  } catch (e) {
    console.warn('[Notify] Audio unlock failed:', e.message);
  }
}

export function playPing() {
  const ctx = getAudioCtx();
  if (!ctx) { console.warn('[Notify] No AudioContext'); return; }

  const doPlay = () => {
    try {
      [880, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
      });
      console.log('[Notify] Ping played ✓');
    } catch (e) {
      console.warn('[Notify] Ping failed:', e.message);
    }
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(doPlay);
  } else {
    doPlay();
  }
}

// ── Supabase Realtime ─────────────────────────────────────────────────────────
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

let _broadcastChannel = null;
function getBroadcastChannel() {
  const clinicId = getClinicId();
  if (!clinicId) return null;
  const client = getClient();
  if (!client) return null;
  if (!_broadcastChannel) {
    _broadcastChannel = client.channel(`clinic-queue-${clinicId}`);
    _broadcastChannel.subscribe((status) => {
      console.log('[Notify] Broadcast channel:', status);
    });
  }
  return _broadcastChannel;
}

const bc = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('clinicping_queue') : null;

export function broadcastQueueUpdate(data) {
  const clinicId = data.clinic_id || getClinicId();
  const payload = { ...data, clinic_id: clinicId };

  if (bc) bc.postMessage(payload);

  const ch = getBroadcastChannel();
  if (ch) {
    ch.send({ type: 'broadcast', event: 'queue_update', payload })
      .then(() => console.log('[Notify] Realtime sent ✓'))
      .catch(e => console.warn('[Notify] Realtime failed:', e.message));
  }
}

export function onQueueUpdate(callback) {
  const unsubs = [];

  if (bc) {
    const handler = (e) => { callback(e.data); };
    bc.addEventListener('message', handler);
    unsubs.push(() => bc.removeEventListener('message', handler));
  }

  const client = getClient();
  const clinicId = getClinicId();
  if (client && clinicId) {
    const ch = client
      .channel(`clinic-queue-${clinicId}`)
      .on('broadcast', { event: 'queue_update' }, ({ payload }) => {
        console.log('[Notify] Realtime received ✓');
        playPing();
        callback(payload);
      })
      .subscribe((status) => {
        console.log('[Notify] Listener status:', status);
      });
    unsubs.push(() => ch.unsubscribe());
  }

  return () => unsubs.forEach(fn => fn());
}
