import { useState, useEffect } from 'react';
import { api, useAuthStore } from '../lib/api';

export default function Analytics() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const isDoctor = user?.role === 'doctor';

  useEffect(() => {
    api.get('/api/analytics/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading analytics...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>No data yet.</div>;

  const days = Object.entries(data.weekByDay || {}).sort(([a], [b]) => a.localeCompare(b));
  const maxPts = Math.max(...days.map(([, d]) => d.total), 1);
  const fuTypes = Object.entries(data.followupStats || {});
  const totalFuSent = fuTypes.reduce((s, [, v]) => s + (v.sent || 0), 0);
  const totalFuTotal = fuTypes.reduce((s, [, v]) => s + (v.total || 0), 0);
  const avgPerDay = days.length > 0 ? Math.round(days.reduce((s, [, d]) => s + d.total, 0) / days.length) : 0;
  const busiestDay = days.length > 0 ? days.reduce((a, b) => b[1].total > a[1].total ? b : a) : null;
  const today = data.today || {};

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Analytics</h1>
          <p style={S.sub}>
            {isDoctor
              ? `Your performance · ${user?.name}`
              : 'Clinic-wide performance'}
          </p>
        </div>
      </div>

      {/* Today strip */}
      <div style={S.todayStrip}>
        <div style={S.todayLabel}>Today</div>
        <div style={S.todayStats}>
          {[
            { label: 'Total', val: today.total || 0, color: '#1a1a1a' },
            { label: 'Seen', val: today.done || 0, color: '#1D9E75' },
            { label: 'Waiting', val: today.waiting || 0, color: '#854F0B' },
            { label: 'Consulting', val: today.consulting || 0, color: '#085041' },
          ].map(({ label, val, color }) => (
            <div key={label} style={S.todayStat}>
              <div style={{ ...S.todayVal, color }}>{val}</div>
              <div style={S.todayStatLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div style={S.metricsGrid}>
        <MetricCard label="This week" value={days.reduce((s, [, d]) => s + d.total, 0)} sub="total patients" color="#1D9E75" />
        <MetricCard label="Average per day" value={avgPerDay} sub="patients / day" color="#185FA5" />
        <MetricCard label="Follow-ups sent" value={totalFuSent} sub={`of ${totalFuTotal} scheduled`} color="#854F0B" />
        <MetricCard label={isDoctor ? 'Your patients' : 'All patients'} value={data.totalPatients || 0} sub="total in database" color="#3C3489" />
      </div>

      {/* ── ADMIN: Per-doctor breakdown ── */}
      {!isDoctor && data.doctorBreakdown && data.doctorBreakdown.length > 0 && (
        <div style={S.card}>
          <div style={S.cardHead}>
            <span>Today by doctor</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {data.doctorBreakdown.map(dr => (
              <div key={dr.id} style={S.drRow}>
                <div style={S.drAvatar}>{dr.name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.drName}>{dr.name}</div>
                  <div style={S.drMeta}>{dr.role}</div>
                </div>
                <div style={S.drStats}>
                  <div style={S.drStat}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#1D9E75' }}>{dr.today.done}</span>
                    <span style={S.drStatLabel}>done</span>
                  </div>
                  <div style={S.drStat}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#854F0B' }}>{dr.today.waiting}</span>
                    <span style={S.drStatLabel}>waiting</span>
                  </div>
                  <div style={S.drStat}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#888' }}>{dr.week}</span>
                    <span style={S.drStatLabel}>this week</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week chart */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <span>Patients this week</span>
          {busiestDay && (
            <span style={S.cardBadge}>
              Busiest: {new Date(busiestDay[0] + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} ({busiestDay[1].total})
            </span>
          )}
        </div>
        {days.length === 0 ? (
          <p style={S.empty}>No data yet this week.</p>
        ) : (
          <div style={{ padding: '8px 16px 16px' }}>
            {days.map(([date, d]) => {
              const pct = Math.round((d.total / maxPts) * 100);
              const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
              const isToday = date === new Date().toISOString().split('T')[0];
              return (
                <div key={date} style={S.barRow}>
                  <span style={{ ...S.barLabel, fontWeight: isToday ? 700 : 400, color: isToday ? '#1D9E75' : '#888' }}>
                    {dayName}
                  </span>
                  <div style={S.barTrack}>
                    <div style={{ ...S.barFill, width: `${pct}%`, background: isToday ? '#1D9E75' : '#9FE1CB' }} />
                  </div>
                  <span style={{ ...S.barVal, color: isToday ? '#1D9E75' : '#1a1a1a', fontWeight: isToday ? 700 : 500 }}>{d.total}</span>
                  <span style={S.barDone}>{d.done} done</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Follow-up performance */}
      {fuTypes.length > 0 && (
        <div style={S.card}>
          <div style={S.cardHead}>Follow-up performance this week</div>
          <div style={{ padding: '8px 16px 16px' }}>
            {fuTypes.map(([type, stats]) => {
              const rate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;
              const barColor = rate >= 70 ? '#1D9E75' : rate >= 40 ? '#EF9F27' : '#E24B4A';
              const TYPE_LABEL = { medicine: 'Medicine reminders', appointment: 'Appointment confirmations', lab: 'Lab report alerts', wellness: 'Wellness checks' };
              return (
                <div key={type} style={S.barRow}>
                  <span style={{ ...S.barLabel, width: 180 }}>{TYPE_LABEL[type] || type}</span>
                  <div style={S.barTrack}><div style={{ ...S.barFill, width: `${rate}%`, background: barColor }} /></div>
                  <span style={{ ...S.barVal, color: barColor }}>{rate}%</span>
                  <span style={S.barDone}>{stats.sent}/{stats.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insights */}
      <div style={S.insightsGrid}>
        {avgPerDay > 0 && (
          <InsightCard
            title={avgPerDay >= 20 ? 'High volume clinic' : avgPerDay >= 10 ? 'Growing steadily' : 'Getting started'}
            text={avgPerDay >= 20 ? `${avgPerDay} patients/day — consider a second doctor slot` : avgPerDay >= 10 ? `${avgPerDay} patients/day. Share ClinicPing with more patients` : `${avgPerDay} patients/day so far. Keep going!`}
            bg="#E1F5EE"
          />
        )}
        {totalFuSent > 0 && (
          <InsightCard
            title="Follow-ups working"
            text={`${totalFuSent} reminders sent this week. Patients who receive follow-ups return 2x more often.`}
            bg="#E6F1FB"
          />
        )}
        {(data.totalPatients || 0) > 0 && (
          <InsightCard
            title="Patient base growing"
            text={`${data.totalPatients} ${isDoctor ? 'patients seen by you' : 'total patients in clinic database'}.`}
            bg="#FAEEDA"
          />
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={S.metricCard}>
      <div style={{ ...S.metricVal, color }}>{value}</div>
      <div style={S.metricLabel}>{label}</div>
      <div style={S.metricSub}>{sub}</div>
    </div>
  );
}

function InsightCard({ title, text, bg }) {
  return (
    <div style={{ ...S.insightCard, background: bg + '40' }}>
      <div style={S.insightTitle}>{title}</div>
      <div style={S.insightSub}>{text}</div>
    </div>
  );
}

const S = {
  page: { maxWidth: 900 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a1a' },
  sub: { fontSize: 13, color: '#888', marginTop: 3 },
  todayStrip: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 },
  todayLabel: { fontSize: 11, fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, background: '#E1F5EE', padding: '4px 10px', borderRadius: 20 },
  todayStats: { display: 'flex', gap: 32, flex: 1 },
  todayStat: { textAlign: 'center' },
  todayVal: { fontSize: 22, fontWeight: 700 },
  todayStatLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 16 },
  metricCard: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 14px' },
  metricVal: { fontSize: 28, fontWeight: 700, lineHeight: 1 },
  metricLabel: { fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginTop: 6 },
  metricSub: { fontSize: 11, color: '#aaa', marginTop: 3 },
  card: { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f5f5f3', fontSize: 13, fontWeight: 600, color: '#444', background: '#fafaf8' },
  cardBadge: { fontSize: 11, background: '#E1F5EE', color: '#085041', padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  empty: { padding: '20px 16px', color: '#888', fontSize: 13 },
  drRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #f5f5f3' },
  drAvatar: { width: 36, height: 36, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 },
  drName: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  drMeta: { fontSize: 11, color: '#aaa', marginTop: 2, textTransform: 'capitalize' },
  drStats: { display: 'flex', gap: 20 },
  drStat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  drStatLabel: { fontSize: 11, color: '#aaa', marginTop: 2 },
  barRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' },
  barLabel: { width: 120, fontSize: 12, color: '#888', flexShrink: 0 },
  barTrack: { flex: 1, height: 8, background: '#f5f5f3', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, transition: 'width 0.5s ease' },
  barVal: { width: 28, fontSize: 13, fontWeight: 500, textAlign: 'right', flexShrink: 0 },
  barDone: { width: 52, fontSize: 11, color: '#aaa', textAlign: 'right', flexShrink: 0 },
  insightsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 20 },
  insightCard: { borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.06)' },
  insightTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 },
  insightSub: { fontSize: 12, color: '#555', lineHeight: 1.5 },
};
