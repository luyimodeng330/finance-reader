/* ============================================================
   强女思维 · 金融资本库  —  封面进入 + 主题切换 + 会员校验
   流程：
   1) 封面（首页）：同一浏览器会话只出现一次；重新打开才再显。
   2) 会员验证（第二步）：进入首页后立即弹出，输入会员邮箱方可阅读；
      解锁状态在「本会话」内全局有效（首页 / 分区 / 文章通用）。
   3) 主题：深色 / 浅色可切换，偏好持久保存。
   MVP 用客户端校验；生产应改服务端校验（不暴露名单）。
   ============================================================ */
(function () {
  var ASSET_BASE = new URL('.', document.currentScript.src).href; // .../assets/
  var EK = 'fin_entered';   // 是否已看过封面（本会话只显一次）
  var UK = 'fin_unlocked';  // 会员是否已解锁（本会话有效）
  var TK = 'fin_theme';     // 主题偏好（持久）

  var MEMBERS = [];         // 会员名单（fetch 后填充）

  function $(id) { return document.getElementById(id); }
  function setS(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function getS(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  /* ---------- 主题 ---------- */
  function applyTheme(t) {
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.toggle('theme-light', t === 'light');
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(TK); } catch (e) {}
    applyTheme(saved === 'light' ? 'light' : 'dark');
    var btn = $('themeToggle');
    if (btn) btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem(TK, next); } catch (e) {}
    });
  }

  /* ---------- 封面（仅首页，会话内只显一次）---------- */
  function initCover() {
    var cover = $('cover');
    if (!cover) return;                       // 分区页 / 文章页无封面
    if (getS(EK)) { cover.style.display = 'none'; return; }
    var enter = $('enter');
    if (!enter) return;
    enter.addEventListener('click', function () {
      setS(EK, '1');
      cover.classList.add('dissolve');
      setTimeout(function () { cover.style.display = 'none'; }, 1000);
      // 第二步：封面淡出后弹出会员验证
      setTimeout(function () {
        if (!getS(UK)) initGate(MEMBERS);
      }, 1050);
    });
  }

  /* ---------- 会员校验 ---------- */
  function check(email, members) {
    var e = (email || '').toLowerCase().trim();
    var m = members.find(function (x) { return x.email === e; });
    if (!m) return { ok: false, msg: '未找到该邮箱，请确认购买时登记的邮箱。' };
    if (m.expire && new Date(m.expire + 'T00:00:00') < new Date()) {
      return { ok: false, expired: true, expire: m.expire,
               msg: '你的订阅已于 ' + m.expire + ' 到期。' };
    }
    return { ok: true, m: m };
  }

  function hideGate() { var g = $('gate'); if (g) g.classList.remove('visible'); }
  function showGate(opts) {
    var g = $('gate'); if (!g) return;
    if (opts) {
      if ($('gate-title')) $('gate-title').textContent = opts.title;
      if ($('gate-desc')) $('gate-desc').textContent = opts.desc;
      var rn = $('renew'); if (rn) rn.style.display = opts.renew ? 'inline-block' : 'none';
    }
    g.classList.add('visible');
  }
  function revealContent() {
    var body = $('article-body'); if (body) body.classList.remove('locked');
  }
  function greet(m) {
    var name = m.name || m.email;
    var g1 = $('greet-bar'); if (g1) g1.textContent = '欢迎，' + name;
    var g2 = $('top-greet'); if (g2) g2.textContent = '欢迎，' + name;
  }

  function bindUnlock(members) {
    var btn = $('unlock');
    if (!btn) return;
    btn.onclick = function () {
      var email = $('email') ? $('email').value : '';
      var r = check(email, members);
      var msg = $('gate-msg');
      if (r.ok) {
        setS(UK, email.toLowerCase().trim());
        hideGate();
        revealContent();
        greet(r.m);
        if (msg) { msg.textContent = ''; msg.className = 'gate-msg'; }
      } else {
        if (msg) { msg.className = 'gate-msg err'; msg.textContent = r.msg; }
        if (r.expired) showGate({
          title: '订阅已到期',
          desc: '你的会员已到期，续费后可继续阅读全部内容。',
          renew: true
        });
      }
    };
    var inp = $('email');
    if (inp) inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && btn) btn.click();
    });
  }

  function initGate(members) {
    var saved = getS(UK);
    if (saved) {
      var r = check(saved, members);
      if (r.ok) { hideGate(); revealContent(); greet(r.m); }
      else if (r.expired) {
        showGate({ title: '订阅已到期',
                   desc: '你的会员已到期，续费后可继续阅读全部内容。', renew: true });
      } else {
        showGate({ title: '订阅会员专享',
                   desc: '输入你购买时登记的邮箱，解锁全文。', renew: false });
      }
    } else {
      showGate({ title: '订阅会员专享',
                 desc: '输入你购买时登记的邮箱，解锁全部展厅。', renew: false });
    }
    bindUnlock(members);
  }

  /* ---------- 启动 ---------- */
  initTheme();
  initCover();

  fetch(ASSET_BASE + 'members.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      MEMBERS = data.members || [];
      // 分区页 / 文章页 / 已看过封面的首页：直接按需弹验证
      if (!$('cover') || getS(EK)) initGate(MEMBERS);
    })
    .catch(function () {
      if (!$('cover') || getS(EK)) initGate([]);
    });
})();
