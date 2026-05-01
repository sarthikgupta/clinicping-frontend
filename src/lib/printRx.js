// printRx.js — call printRx(consultation, patient, settings) from anywhere
// Opens a new window with the prescription and triggers browser print dialog

export function printRx(consultation, patient, settings) {
  const color = settings.rx_color || '#1D9E75';
  const template = settings.rx_template || 'classic';
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const meds = (consultation.medicines || [])
    .filter(m => m.name)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const tests = (consultation.tests_ordered || [])
    .filter(t => t.name)
    .map(t => t.name);

  const treatmentsList = (consultation.treatments || [])
    .filter(t => t.name)
    .sort((a,b) => (a.sort_order||0)-(b.sort_order||0));

  const nextAppt = consultation.next_appointment_date
    ? new Date(consultation.next_appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  let body = '';

  if (template === 'classic') {
    body = `
      <div class="rx">
        <div class="hdr" style="background:${color};">
          <div>
            <div class="hdr-name">${settings.doctor_name || ''}</div>
            <div class="hdr-sub">${settings.doctor_qualification || ''} · Reg: ${settings.doctor_registration || ''}</div>
            <div class="hdr-sub" style="margin-top:3px;">${settings.clinic_timings || ''}</div>
          </div>
          <div class="hdr-right">
            ${settings.clinic_address || ''}<br>
            Ph: ${settings.phone || ''}
          </div>
        </div>
        <div class="body">
          <div class="pt-row">
            <div class="pt-field"><div class="pt-label">Patient</div><div class="pt-val">${patient.name}</div></div>
            <div class="pt-field"><div class="pt-label">Phone</div><div class="pt-val">${patient.phone || '—'}</div></div>
            <div class="pt-field"><div class="pt-label">Date</div><div class="pt-val">${date}</div></div>
            <div class="pt-field"><div class="pt-label">Visit</div><div class="pt-val">#${patient.visit_count || 1}</div></div>
          </div>
          ${consultation.diagnosis ? `<div class="diag"><strong>Diagnosis:</strong> ${consultation.diagnosis}</div>` : ''}
          <div class="rx-sym">&#8478;</div>
          <table class="med-table">
            <tr><th style="width:50%">Medicine</th><th style="width:25%">Dose</th><th style="width:25%">Duration</th></tr>
            ${meds.map(m => `<tr><td>${m.name}</td><td>${m.dose || '—'}</td><td>${m.duration || '—'}</td></tr>`).join('')}
          </table>
          ${treatmentsList.length > 0 ? `<div class="tests-section" style="margin-top:10px;"><div class="tests-label">Treatments</div><table class="med-table" style="margin-top:6px;"><tr><th style="width:50%">Treatment</th><th style="width:25%">Duration</th><th style="width:25%">Notes</th></tr>${treatmentsList.map(t => `<tr><td>${t.name}</td><td>${t.duration||'—'}</td><td>${t.notes||'—'}</td></tr>`).join('')}</table></div>` : ''}
          ${tests.length > 0 ? `<div class="tests-section" style="margin-top:10px;"><div class="tests-label">Tests advised</div><div class="tests-val">${tests.join(' &nbsp;·&nbsp; ')}</div></div>` : ''}
          ${nextAppt ? `<div class="appt-box" style="background:${color}15;border-left:3px solid ${color};">Next appointment: <strong>${nextAppt}</strong>${consultation.next_appointment_note ? ' · ' + consultation.next_appointment_note : ''}</div>` : ''}
          ${settings.rx_footer_note ? `<div class="footer-note">${settings.rx_footer_note}</div>` : ''}
        </div>
        <div class="footer">
          <div style="font-size:10px;color:#aaa;">Powered by ClinicPing</div>
          <div class="sig-area" style="border-top:2px solid ${color};">
            <div class="sig-name" style="color:${color};">${settings.doctor_name || ''}</div>
            <div class="sig-label">Signature</div>
          </div>
        </div>
      </div>`;
  }

  if (template === 'modern') {
    body = `
      <div class="rx">
        <div class="hdr" style="border-top:4px solid ${color};">
          <div>
            <div class="hdr-name">${settings.doctor_name || ''}</div>
            <div class="hdr-sub">${settings.doctor_qualification || ''} · Reg: ${settings.doctor_registration || ''}</div>
          </div>
          <div class="hdr-right">
            ${settings.clinic_address || ''}<br>Ph: ${settings.phone || ''}<br>${settings.clinic_timings || ''}
          </div>
        </div>
        <div class="body">
          <div class="pt-bar" style="background:${color}12;border:1px solid ${color}33;">
            <div class="pt-item"><div class="pt-label">Patient</div><div class="pt-val">${patient.name}</div></div>
            <div class="pt-item"><div class="pt-label">Phone</div><div class="pt-val">${patient.phone || '—'}</div></div>
            <div class="pt-item"><div class="pt-label">Date</div><div class="pt-val">${date}</div></div>
            <div class="pt-item"><div class="pt-label">Visit no.</div><div class="pt-val">#${patient.visit_count || 1}</div></div>
          </div>
          ${consultation.diagnosis ? `<div class="diag">${consultation.diagnosis}</div>` : ''}
          <div class="rx-pill" style="background:${color}18;color:${color};">&#8478; Prescription</div>
          ${meds.map((m, i) => `
            <div class="med-row">
              <div class="med-num" style="background:${color};">${i + 1}</div>
              <div class="med-name">${m.name}</div>
              <div class="med-detail">${m.dose || ''}</div>
              <div class="med-detail">${m.duration || ''}</div>
            </div>`).join('')}
          ${treatmentsList.length > 0 ? `
            <div class="tests-wrap">
              <div class="tests-label">Treatments</div>
              <div style="margin-top:5px;">${treatmentsList.map(t => `
                <div class="med-row">
                  <div class="med-name">${t.name}</div>
                  <div class="med-detail">${t.duration||'—'}</div>
                  <div class="med-detail">${t.notes||'—'}</div>
                </div>`).join('')}
              </div>
            </div>` : ''}
          ${tests.length > 0 ? `
            <div class="tests-wrap">
              <div class="tests-label">Tests advised</div>
              <div class="chips">${tests.map(t => `<span class="chip">${t}</span>`).join('')}</div>
            </div>` : ''}
          ${nextAppt ? `
            <div class="appt-row" style="border:1.5px solid ${color};">
              <div><div class="appt-label" style="color:${color};">Next appointment</div><div class="appt-date">${nextAppt}${consultation.next_appointment_note ? ' · ' + consultation.next_appointment_note : ''}</div></div>
            </div>` : ''}
          ${settings.rx_footer_note ? `<div class="footer-note">${settings.rx_footer_note}</div>` : ''}
        </div>
        <div class="footer">
          <div style="font-size:10px;color:#aaa;">Powered by ClinicPing</div>
          <div class="sig-area" style="border-top:2px solid ${color};">
            <div class="sig-name" style="color:${color};">${settings.doctor_name || ''}</div>
            <div class="sig-label">Signature</div>
          </div>
        </div>
      </div>`;
  }

  if (template === 'minimal') {
    body = `
      <div class="rx">
        <div class="hdr" style="border-bottom:2px solid #1a1a1a;">
          <div class="hdr-name">${settings.doctor_name || ''}</div>
          <div class="hdr-sub">${settings.doctor_qualification || ''} · Reg: ${settings.doctor_registration || ''} · ${settings.phone || ''}</div>
          <div class="hdr-sub">${settings.clinic_address || ''} · ${settings.clinic_timings || ''}</div>
        </div>
        <div class="body">
          <div class="pt-line">Patient: <strong>${patient.name}</strong> &nbsp;|&nbsp; Ph: ${patient.phone || '—'} &nbsp;|&nbsp; Date: ${date} &nbsp;|&nbsp; Visit: #${patient.visit_count || 1}</div>
          ${consultation.diagnosis ? `<div class="diag-min">Dx: ${consultation.diagnosis}</div>` : ''}
          <div class="rx-sym-min">&#8478;</div>
          ${meds.map((m, i) => `
            <div class="med-min">${i + 1}. ${m.name}
              <div class="med-sub-min">Dose: ${m.dose || '—'} &nbsp;·&nbsp; Duration: ${m.duration || '—'}</div>
            </div>`).join('')}
          ${treatmentsList.length > 0 ? `<hr class="divider"/><div class="tests-min">Treatments: ${treatmentsList.map(t => t.name + (t.duration ? ' ('+t.duration+')' : '')).join(' · ')}</div>` : ''}
          ${tests.length > 0 ? `<hr class="divider"/><div class="tests-min">Tests: ${tests.join(' · ')}</div>` : ''}
          ${nextAppt ? `<div class="tests-min" style="margin-top:6px;">Next visit: <strong>${nextAppt}</strong>${consultation.next_appointment_note ? ' — ' + consultation.next_appointment_note : ''}</div>` : ''}
          ${settings.rx_footer_note ? `<div class="footer-note">${settings.rx_footer_note}</div>` : ''}
        </div>
        <div class="footer" style="border-top:2px solid #1a1a1a;">
          <div>${settings.clinic_timings || ''}</div>
          <div class="sig-area" style="border-top:1px solid #1a1a1a;">
            <div class="sig-name">${settings.doctor_name || ''}</div>
            <div class="sig-label">Signature</div>
          </div>
        </div>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Prescription — ${patient.name}</title>
  <style>
    @media print {
      @page { size: A5; margin: 0; }
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }

    /* ── CLASSIC ── */
    .hdr { padding: 14px 20px; display: flex; justify-content: space-between; align-items: flex-start; color: #fff; }
    .hdr-name { font-size: 15px; font-weight: 700; }
    .hdr-sub { font-size: 10px; opacity: 0.85; margin-top: 2px; }
    .hdr-right { text-align: right; font-size: 10px; opacity: 0.9; line-height: 1.6; }
    .body { padding: 14px 20px; }
    .pt-row { display: flex; gap: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 12px; }
    .pt-field { flex: 1; }
    .pt-label { font-size: 9px; color: #aaa; text-transform: uppercase; letter-spacing: 0.04em; }
    .pt-val { font-weight: 700; color: #1a1a1a; margin-top: 1px; font-size: 12px; }
    .diag { font-size: 11px; color: #444; margin-bottom: 10px; padding: 8px 10px; background: #f8f8f6; border-radius: 5px; }
    .rx-sym { font-size: 26px; font-weight: 700; color: ${color}; font-family: serif; margin-bottom: 6px; }
    .med-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
    .med-table th { text-align: left; font-size: 9px; color: #aaa; text-transform: uppercase; padding: 4px 0; border-bottom: 1px solid #eee; }
    .med-table td { padding: 6px 0; border-bottom: 1px solid #f5f5f3; }
    .tests-section { margin-top: 10px; }
    .tests-label { font-size: 9px; color: #aaa; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
    .tests-val { font-size: 11px; color: #444; }
    .appt-box { margin-top: 10px; padding: 8px 12px; font-size: 11px; border-radius: 5px; }
    .footer-note { margin-top: 8px; font-size: 10px; color: #888; font-style: italic; }
    .footer { padding: 10px 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-end; }
    .sig-area { text-align: center; padding-top: 4px; min-width: 130px; }
    .sig-name { font-size: 11px; font-weight: 700; }
    .sig-label { font-size: 9px; color: #aaa; margin-top: 2px; }

    /* ── MODERN ── */
    .hdr { padding: 14px 20px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #eee; }
    .hdr-name { font-size: 15px; font-weight: 700; color: #1a1a1a; }
    .hdr-right { text-align: right; font-size: 10px; color: #888; line-height: 1.6; }
    .pt-bar { display: flex; gap: 16px; padding: 10px 14px; border-radius: 7px; margin-bottom: 12px; }
    .pt-item { flex: 1; }
    .pt-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
    .pt-val { font-weight: 700; font-size: 12px; margin-top: 2px; }
    .rx-pill { display: inline-block; font-size: 12px; font-weight: 700; padding: 3px 12px; border-radius: 20px; margin-bottom: 10px; }
    .med-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid #f5f5f3; }
    .med-num { width: 20px; height: 20px; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .med-name { flex: 2; font-weight: 600; }
    .med-detail { flex: 1; color: #666; font-size: 11px; }
    .tests-wrap { margin-top: 12px; }
    .tests-label { font-size: 9px; color: #aaa; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 5px; }
    .chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .chip { background: #FAEEDA; color: #854F0B; font-size: 10px; padding: 3px 9px; border-radius: 20px; font-weight: 500; }
    .appt-row { display: flex; margin-top: 12px; padding: 8px 14px; border-radius: 7px; }
    .appt-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .appt-date { font-weight: 700; font-size: 12px; margin-top: 2px; }

    /* ── MINIMAL ── */
    .hdr { padding: 12px 20px; }
    .hdr-name { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    .pt-line { font-size: 11px; color: #444; border-bottom: 1px dashed #ccc; padding-bottom: 8px; margin-bottom: 10px; }
    .diag-min { font-size: 11px; color: #444; margin-bottom: 10px; }
    .rx-sym-min { font-size: 22px; font-weight: 700; margin-bottom: 8px; font-family: serif; }
    .med-min { font-size: 12px; margin-bottom: 6px; }
    .med-sub-min { font-size: 10px; color: #666; margin-left: 14px; margin-top: 2px; }
    .divider { border: none; border-top: 1px dashed #ccc; margin: 10px 0; }
    .tests-min { font-size: 11px; color: #444; }

    .print-btn { display: block; margin: 16px auto; padding: 10px 28px; background: ${color}; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  ${body}
  <div class="no-print" style="text-align:center;margin:16px 0;">
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
    <div style="font-size:11px;color:#aaa;margin-top:6px;">Or press Cmd+P (Mac) / Ctrl+P (Windows)</div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=680,height=900');
  win.document.write(html);
  win.document.close();
}
