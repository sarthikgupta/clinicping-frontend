// lib/notify.js — cross-device queue notifications
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Same-device cross-tab
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('clinicping_queue') : null;

let activeChannel = null;

// ── Ping sound ────────────────────────────────────────────────────────────
export function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.4);
  } catch (e) { console.warn('Audio ping failed:', e); }
}

// ── Broadcast (called by doctor) ─────────────────────────────────────────
export async function broadcastQueueUpdate(data) {
  // Same device
  if (bc) bc.postMessage(data);

  // Cross-device
  if (supabase && activeChannel) {
    await activeChannel.send({
      type: 'broadcast',
      event: 'queue_update',
      payload: data,
    });
  }
}

// ── Subscribe (called by receptionist / queue page) ───────────────────────
export function onQueueUpdate(callback) {
  const unsubs = [];

  if (bc) {
    const handler = (e) => callback(e.data);
    bc.addEventListener('message', handler);
    unsubs.push(() => bc.removeEventListener('message', handler));
  }

  if (supabase) {
    const clinicId = getClinicId();
    if (clinicId) {
      const ch = supabase.channel(`queue:${clinicId}`)
        .on('broadcast', { event: 'queue_update' }, ({ payload }) => {
          callback(payload);
          playPing();
        })
        .subscribe();
      activeChannel = ch;
      unsubs.push(() => { supabase.removeChannel(ch); activeChannel = null; });
    }
  }

  return () => unsubs.forEach(fn => fn());
}

// ── Init after login ──────────────────────────────────────────────────────
export function initRealtime(clinicId) {
  if (!supabase || !clinicId) return;
  if (activeChannel) supabase.removeChannel(activeChannel);
  activeChannel = supabase.channel(`queue:${clinicId}`);
  activeChannel.subscribe();
}

function getClinicId() {
  try { return JSON.parse(localStorage.getItem('cp_clinic') || '{}')?.id || null; }
  catch { return null; }
}
