import { useState, useEffect } from 'react';
import { api, useAuthStore } from '../lib/api';

export default function Billing() {
  const { user } = useAuthStore();
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.get('/api/billing/plan')
      .then(r => setPlanData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Check for payment success callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      showToast('Payment successful! Plan activated ✓');
      window.history.replaceState({}, '', '/settings');
      // Reload plan data
      setTimeout(() => {
        api.get('/api/billing/plan').then(r => setPlanData(r.data));
      }, 2000);
    }
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000); }

  async function handleRazorpaySubscription(planId) {
    setUpgrading(planId);
    try {
      const { data } = await api.post('/api/billing/subscribe', { plan_id: planId });

      const options = {
        key: data.razorpay_key,
        subscription_id: data.subscription_id,
        name: 'ClinicPing',
        description: `${planId === 'growth' ? 'Growth' : 'Clinic'} Plan — ₹${data.amount / 100}/month`,
        image: 'https://clinicping.space/logo.png',
        handler: async (response) => {
          try {
            await api.post('/api/billing/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId,
            });
            showToast('Plan activated! ✓');
            const r = await api.get('/api/billing/plan');
            setPlanData(r.data);
          } catch { showToast('Payment verification failed. Contact support.'); }
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#1D9E75' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to initiate payment');
    } finally { setUpgrading(null); }
  }

  async function handleUPILink(planId) {
    setUpgrading(planId + '_upi');
    try {
      const { data } = await api.post('/api/billing/upi', { plan_id: planId });
      window.open(data.payment_link, '_blank');
      showToast('Payment link opened. Complete payment to activate plan.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate payment link');
    } finally { setUpgrading(null); }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>;
  if (!planData) return null;

  const isAdmin = user?.role === 'admin';
  const isPaid = planData.plan !== 'free';
  const usagePercent = planData.patients_limit
    ? Math.round((planData.patients_this_month / planData.patients_limit) * 100)
    : 0;
  const nearLimit = usagePercent >= 80;
  const atLimit = usagePercent >= 100;

  return (
    <div style={S.page}>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Load Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" />

      <h1 style={S.title}>Plan & Billing</h1>
      <p style={S.sub}>Manage your ClinicPing subscription</p>

      {/* Current plan status */}
      <div style={{ ...S.card, borderColor: isPaid ? '#1D9E75' : '#e8e8e5', borderWidth: 2 }}>
        <div style={S.cardHead}>
          <span>Current plan</span>
          <span style={{ ...S.badge, background: isPaid ? '#E1F5EE' : '#f5f5f3', color: isPaid ? '#085041' : '#888' }}>
            {isPaid ? '✓ Active' : 'Free tier'}
          </span>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>{planData.plan_name}</div>
              {isPaid && planData.plan_expires_at && (
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                  Renews {new Date(planData.plan_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
              {!isPaid && (
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                  Free forever with limits
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
                Patients this month
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: atLimit ? '#A32D2D' : nearLimit ? '#854F0B' : '#1a1a1a' }}>
                {planData.patients_this_month}
                {planData.patients_limit && <span style={{ fontSize: 14, fontWeight: 400, color: '#888' }}> / {planData.patients_limit}</span>}
                {!planData.patients_limit && <span style={{ fontSize: 14, fontWeight: 400, color: '#1D9E75' }}> / ∞</span>}
              </div>
            </div>
          </div>

          {/* Usage bar */}
          {planData.patients_limit && (
            <div style={{ marginTop: 14 }}>
              <div style={S.progressTrack}>
                <div style={{
                  ...S.progressFill,
                  width: `${Math.min(usagePercent, 100)}%`,
                  background: atLimit ? '#A32D2D' : nearLimit ? '#EF9F27' : '#1D9E75',
                }} />
              </div>
              {atLimit && (
                <div style={S.limitAlert}>
                  🚫 Monthly limit reached — patients cannot be added until you upgrade or next month begins
                </div>
              )}
              {nearLimit && !atLimit && (
                <div style={{ ...S.limitAlert, background: '#FAEEDA', color: '#854F0B' }}>
                  ⚠️ {planData.patients_limit - planData.patients_this_month} patients remaining this month
                </div>
              )}
            </div>
          )}

          {/* Features list */}
          <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { label: `${planData.patients_limit ? planData.patients_limit + '/month' : 'Unlimited'} patients`, ok: true },
              { label: `${planData.features.max_doctors} doctor${planData.features.max_doctors > 1 ? 's' : ''}`, ok: true },
              { label: 'WhatsApp messages', ok: planData.features.whatsapp },
              { label: 'Follow-ups', ok: planData.features.followups },
              { label: 'Full analytics', ok: planData.features.analytics === 'full' },
            ].map(f => (
              <div key={f.label} style={{ ...S.featureChip, opacity: f.ok ? 1 : 0.4 }}>
                <span style={{ color: f.ok ? '#1D9E75' : '#aaa' }}>{f.ok ? '✓' : '✕'}</span> {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upgrade options — only show if admin and on free plan or below clinic */}
      {isAdmin && (
        <div>
          <div style={S.sectionTitle}>
            {isPaid ? 'Change plan' : '🚀 Upgrade to unlock everything'}
          </div>

          <div style={S.plansGrid}>
            {planData.plans.filter(p => p.id !== 'free').map(plan => {
              const isCurrent = planData.plan === plan.id;
              return (
                <div key={plan.id} style={{ ...S.planCard, ...(isCurrent ? S.planCardCurrent : {}) }}>
                  {isCurrent && <div style={S.currentBadge}>Current plan</div>}
                  {plan.id === 'growth' && !isCurrent && <div style={S.popularBadge}>Most popular</div>}

                  <div style={S.planName}>{plan.name}</div>
                  <div style={S.planPrice}>
                    ₹{plan.price / 100}
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}>/month</span>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    {[
                      `${plan.patients_per_month} patients/month`,
                      `${plan.max_doctors} doctor${plan.max_doctors > 1 ? 's' : ''}`,
                      plan.whatsapp ? 'WhatsApp messages ✓' : null,
                      plan.followups ? 'Follow-ups & reminders ✓' : null,
                      'Full analytics ✓',
                      'Print prescriptions ✓',
                    ].filter(Boolean).map(f => (
                      <div key={f} style={S.planFeature}>
                        <span style={{ color: '#1D9E75' }}>✓</span> {f}
                      </div>
                    ))}
                  </div>

                  {!isCurrent && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button
                        style={{ ...S.upgradeBtn, opacity: upgrading === plan.id ? 0.7 : 1 }}
                        disabled={!!upgrading}
                        onClick={() => handleRazorpaySubscription(plan.id)}
                      >
                        {upgrading === plan.id ? 'Processing...' : '💳 Pay with card / UPI'}
                      </button>
                      <button
                        style={{ ...S.upiBtn, opacity: upgrading === plan.id + '_upi' ? 0.7 : 1 }}
                        disabled={!!upgrading}
                        onClick={() => handleUPILink(plan.id)}
                      >
                        {upgrading === plan.id + '_upi' ? 'Generating...' : '🔗 Get UPI payment link'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={S.helpNote}>
            Questions? WhatsApp us at <strong>+91 98780 50904</strong> · payments@clinicping.space
          </div>
        </div>
      )}

      {!isAdmin && (
        <div style={S.nonAdminNote}>
          Only clinic admin can manage billing. Contact your admin to upgrade.
        </div>
      )}
    </div>
  );
}

const S = {
  page: { maxWidth: 700 },
  toast: { position: 'fixed', top: 20, right: 20, background: '#1a1a1a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 1000 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 },
  sub: { fontSize: 13, color: '#888', marginBottom: 20 },
  card: { background: '#fff', border: '1.5px solid #e8e8e5', borderRadius: 14, marginBottom: 24, overflow: 'hidden' },
  cardHead: { padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#fafaf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#444' },
  badge: { fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 },
  progressTrack: { height: 8, background: '#f0f0ee', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width 0.4s ease' },
  limitAlert: { marginTop: 10, padding: '10px 14px', background: '#FCEBEB', color: '#A32D2D', borderRadius: 8, fontSize: 13, lineHeight: 1.5 },
  featureChip: { fontSize: 12, background: '#f5f5f3', padding: '4px 12px', borderRadius: 20, color: '#555' },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 14 },
  plansGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 },
  planCard: { background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '20px 18px', position: 'relative' },
  planCardCurrent: { borderColor: '#1D9E75', background: '#f8fffe' },
  currentBadge: { position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap' },
  popularBadge: { position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap' },
  planName: { fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  planPrice: { fontSize: 30, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 },
  planFeature: { fontSize: 13, color: '#444', marginBottom: 6 },
  upgradeBtn: { width: '100%', padding: '12px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  upiBtn: { width: '100%', padding: '10px', background: '#fff', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  helpNote: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 8 },
  nonAdminNote: { background: '#f5f5f3', borderRadius: 10, padding: '16px', fontSize: 13, color: '#888', textAlign: 'center' },
};
