import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client = null;

function getClient() {
  if (!_client && SUPABASE_URL && SUPABASE_ANON_KEY) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
  }
  return _client;
}

// Same-device / same-browser tab sync
const bc = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('clinicping_queue')
  : null;

// ── Play notification ping sound ─────────────────────────────────────────────
export function playPing() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    // Two-tone ping — more noticeable
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
      osc.stop(ctx.currentTime + i * 0.15 + 0.35);
    });
  } catch (e) {
    console.warn('[Notify] Audio ping failed:', e.message);
  }
}

function getClinicId() {
  try {
    return JSON.parse(localStorage.getItem('cp_user') || '{}')?.clinic_id || null;
  } catch {
    return null;
  }
}

// ── Broadcast update (doctor → receptionist) ─────────────────────────────────
export function broadcastQueueUpdate(data) {
  const clinicId = data.clinic_id || getClinicId();
  const payload = { ...data, clinic_id: clinicId };

  // 1. Same device/browser
  if (bc) {
    bc.postMessage(payload);
    console.log('[Notify] BroadcastChannel sent', payload);
  }

  // 2. Cross-device via Supabase Realtime
  const client = getClient();
  if (!client) {
    console.warn('[Notify] Supabase not configured — check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return;
  }
  if (!clinicId) {
    console.warn('[Notify] No clinic_id found — cannot broadcast');
    return;
  }

  const channelName = `clinic-queue-${clinicId}`;
  const ch = client.channel(channelName);
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      ch.send({
        type: 'broadcast',
        event: 'queue_update',
        payload,
      }).then(() => {
        console.log('[Notify] Realtime broadcast sent to', channelName);
      }).catch(e => {
        console.warn('[Notify] Realtime send failed:', e.message);
      });
    }
  });
}

// ── Listen for updates (receptionist side) ───────────────────────────────────
export function onQueueUpdate(callback) {
  const unsubs = [];

  // 1. Same device
  if (bc) {
    const handler = (e) => {
      console.log('[Notify] BroadcastChannel received', e.data);
      callback(e.data);
    };
    bc.addEventListener('message', handler);
    unsubs.push(() => bc.removeEventListener('message', handler));
  }

  // 2. Cross-device
  const client = getClient();
  if (!client) {
    console.warn('[Notify] Supabase not configured — realtime disabled');
    return () => unsubs.forEach(fn => fn());
  }

  const clinicId = getClinicId();
  if (!clinicId) {
    console.warn('[Notify] No clinic_id — cannot subscribe to realtime');
    return () => unsubs.forEach(fn => fn());
  }

  const channelName = `clinic-queue-${clinicId}`;
  console.log('[Notify] Subscribing to Realtime channel:', channelName);

  const ch = client
    .channel(channelName)
    .on('broadcast', { event: 'queue_update' }, ({ payload }) => {
      console.log('[Notify] Realtime received:', payload);
      callback(payload);
    })
    .subscribe((status) => {
      console.log('[Notify] Realtime subscription status:', status);
    });

  unsubs.push(() => {
    ch.unsubscribe();
    console.log('[Notify] Unsubscribed from', channelName);
  });

  return () => unsubs.forEach(fn => fn());
}
