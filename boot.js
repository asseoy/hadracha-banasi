/* הדרכה בנשיא — startup */
'use strict';
(async function boot() {
  Store.loadLocal();
  applyTheme();
  shell();
  // a calm loading state while the library (≈3MB) arrives
  $('#main').innerHTML = `<div style="padding-top:28px"><div class="skeleton" style="height:34px;width:70%;margin-bottom:12px"></div><div class="skeleton" style="height:18px;width:90%;margin-bottom:22px"></div><div class="skeleton" style="height:52px;margin-bottom:16px"></div>${'<div class="skeleton" style="height:84px;margin-bottom:10px"></div>'.repeat(3)}</div>`;
  topbar({ brand: true, back: false });
  try {
    await Lib.load();
  } catch (e) {
    console.error(e);
    const sp0 = $('#splash'); if (sp0) sp0.remove();
    $('#main').innerHTML = `<div class="empty">${ic('alert')}<h3>הספרייה לא נטענה</h3><p>בדקו את החיבור לאינטרנט ונסו לרענן.</p><button class="btn" onclick="location.reload()">רענון</button></div>`;
    return;
  }
  Lib.buildIndex();
  render(true);
  const sp = $('#splash'); if (sp) { sp.classList.add('out'); setTimeout(() => sp.remove(), 400); }
  // phones: hide the bottom bar while typing so it never covers the field
  const typing = el => el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|file)$/.test(el.type)));
  document.addEventListener('focusin', e => { if (innerWidth < 1000 && typing(e.target)) document.body.classList.add('kb'); });
  document.addEventListener('focusout', () => setTimeout(() => { if (!typing(document.activeElement)) document.body.classList.remove('kb'); }, 80));
  Store.connectCloud();   // light up cross-device sync when the viewer allows it
  window.addEventListener('pagehide', () => { if (Store._saveLocal) Store._saveLocal.flush(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && Store._saveLocal) Store._saveLocal.flush(); });
})();
