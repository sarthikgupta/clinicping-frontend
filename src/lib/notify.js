import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Audio ─────────────────────────────────────────────────────────────────────
let _ctx = null;
let _unlocked = false;

export function unlockAudio() {
  if (_unlocked) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!_ctx) _ctx = new AC();
    const buf = _ctx.createBuffer(1, 1, 22050);
    const src = _ctx.createBufferSource();
    src.buffer = buf;
    src.connect(_ctx.destination);
    src.start(0);
    if (_ctx.state === 'suspended') _ctx.resume();
    _unlocked = true;
    console.log('[Notify] Audio unlocked ✓ state:', _ctx.state);
  } catch (e) {
    console.warn('[Notify] Unlock error:', e.message);
  }
}

export function playPing() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!_ctx) _ctx = new AC();

    const doPlay = () => {
      [880, 660].forEach((freq, i) => {
        const osc = _ctx.createOscillator();
        const gain = _ctx.createGain();
        osc.connect(gain);
        gain.connect(_ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = _ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
      });
      console.log('[Notify] Ping played ✓ ctx:', _ctx.state);
    };

    if (_ctx.state === 'running') {
      doPlay();
    } else {
      _ctx.resume().then(doPlay);
    }
  } catch (e) {
    console.warn('[Notify] playPing error:', e.message);
  }
}

// ── Supabase ──────────────────────────────────────────────────────────────────
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

function getChannelName() {
  return `clinic-queue-${getClinicId()}`;
}

// Persistent sender channel (doctor side)
let _senderCh = null;

// Same-device tabs
const bc = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('clinicping_queue') : null;

// ── Send (doctor clicks save & next) ─────────────────────────────────────────
export function broadcastQueueUpdate(data) {
  const clinicId = data.clinic_id || getClinicId();
  const payload = { ...data, clinic_id: clinicId };

  // Same browser tabs
  if (bc) bc.postMessage(payload);

  // Cross-device
  const client = getClient();
  if (!client || !clinicId) {
    console.warn('[Notify] Cannot send — no supabase client or clinicId');
    return;
  }

  // Create sender channel if not exists
  if (!_senderCh) {
    _senderCh = client.channel(getChannelName());
    _senderCh.subscribe((s) => console.log('[Notify] Sender channel:', s));
  }

  _senderCh.send({
    type: 'broadcast',
    event: 'queue_update',
    payload,
  }).then(() => {
    console.log('[Notify] Realtime broadcast sent ✓');
  }).catch(e => {
    console.warn('[Notify] Broadcast failed:', e.message);
  });
}

// ── Listen (receptionist side) ────────────────────────────────────────────────
export function onQueueUpdate(callback) {
  const unsubs = [];

  // Same device
  if (bc) {
    const h = (e) => callback(e.data);
    bc.addEventListener('message', h);
    unsubs.push(() => bc.removeEventListener('message', h));
  }

  // Cross-device
  const client = getClient();
  const clinicId = getClinicId();

  if (!client || !clinicId) {
    console.warn('[Notify] No supabase or clinicId — realtime disabled');
    return () => unsubs.forEach(fn => fn());
  }

  const name = getChannelName();
  console.log('[Notify] Listening on:', name);

  const ch = client
    .channel(name)
    .on('broadcast', { event: 'queue_update' }, ({ payload }) => {
      console.log('[Notify] Received update, playing ping...');
      playPing();
      callback(payload);
    })
    .subscribe((status) => {
      console.log('[Notify] Listener status:', status);
    });

  unsubs.push(() => ch.unsubscribe());
  return () => unsubs.forEach(fn => fn());
}
