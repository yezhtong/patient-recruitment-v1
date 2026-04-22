/* ============================================================
   原型交互脚本（共享）— 仅 V1 原型演示用
   - 移动端顶部菜单切换
   - 筛选已选标签关闭
   - 试验列表筛选复选框 URL 反映
   - 预筛 / 注册 / 联系 表单校验与提交成功
   - 验证码倒计时
   - 后台线索状态即时更新提示
   - 后台表格全选 / 批量操作
   - 吐司提示
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 吐司 Toast ---------- */
  function toast(msg, type) {
    type = type || 'info';
    var el = document.createElement('div');
    el.className = 'proto-toast proto-toast--' + type;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-show'); });
    setTimeout(function () {
      el.classList.remove('is-show');
      setTimeout(function () { el.remove(); }, 300);
    }, 2600);
  }
  window.__protoToast = toast;

  /* ---------- 注入吐司样式 ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '.proto-toast{position:fixed;bottom:32px;left:50%;transform:translate(-50%,20px);',
    'background:var(--ink-900);color:var(--cream-50);padding:14px 22px;border-radius:999px;',
    'font-size:14px;box-shadow:0 12px 32px rgba(10,20,17,.25);opacity:0;transition:all .3s var(--ease-out);',
    'z-index:9999;max-width:90vw;text-align:center;}',
    '.proto-toast.is-show{opacity:1;transform:translate(-50%,0);}',
    '.proto-toast--success{background:var(--success-700);}',
    '.proto-toast--danger{background:var(--danger-500);}',
    '.proto-toast--warning{background:var(--warning-500);}',
    /* 移动端菜单 */
    '@media(max-width:880px){',
    '.nav.is-open{display:flex;position:fixed;top:76px;left:0;right:0;background:var(--cream-0);',
    'flex-direction:column;padding:16px 24px;gap:8px;border-bottom:1px solid var(--ink-100);',
    'box-shadow:0 12px 32px rgba(10,20,17,.08);z-index:90;}',
    '.nav.is-open a{padding:12px 0;font-size:16px;}',
    '.nav-toggle{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;',
    'border-radius:50%;border:1px solid var(--ink-200);background:transparent;cursor:pointer;}',
    '}',
    '@media(min-width:881px){.nav-toggle{display:none;}}',
  ].join('');
  document.head.appendChild(css);

  /* ---------- 移动端菜单切换 ---------- */
  document.querySelectorAll('.site-header__inner').forEach(function (hdr) {
    var nav = hdr.querySelector('.nav');
    if (!nav) return;
    // 如果已经有 toggle 按钮则跳过
    if (hdr.querySelector('.nav-toggle')) return;
    var btn = document.createElement('button');
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', '打开菜单');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    hdr.appendChild(btn);
  });

  /* ---------- 已选筛选标签关闭 ---------- */
  document.querySelectorAll('.applied-tag button').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var tag = btn.closest('.applied-tag');
      tag.style.transition = 'opacity .2s,transform .2s';
      tag.style.opacity = '0';
      tag.style.transform = 'scale(.85)';
      setTimeout(function () { tag.remove(); toast('已移除筛选条件', 'info'); }, 200);
    });
  });

  /* ---------- 全部清除 ---------- */
  var clearAll = document.querySelector('.filter-panel a.btn--text');
  if (clearAll && clearAll.textContent.indexOf('清除') !== -1) {
    clearAll.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.filter-options input[type=checkbox]').forEach(function (cb) { cb.checked = false; });
      document.querySelectorAll('.applied-tag').forEach(function (t) { t.remove(); });
      toast('已清除全部筛选', 'info');
    });
  }

  /* ---------- 表单提交（阻止真实提交，模拟成功反馈） ---------- */
  document.querySelectorAll('form[data-prototype]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var required = form.querySelectorAll('[required]');
      var firstInvalid = null;
      for (var i = 0; i < required.length; i++) {
        if (!required[i].value || (required[i].type === 'checkbox' && !required[i].checked)) {
          if (!firstInvalid) firstInvalid = required[i];
        }
      }
      if (firstInvalid) {
        firstInvalid.focus();
        toast('请完整填写必填项', 'warning');
        return;
      }
      var next = form.getAttribute('data-success-redirect');
      var msg = form.getAttribute('data-success-msg') || '提交成功';
      toast(msg, 'success');
      if (next) setTimeout(function () { location.href = next; }, 900);
    });
  });

  /* ---------- 短信验证码倒计时 ---------- */
  document.querySelectorAll('[data-send-sms]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (btn.disabled) return;
      var phoneInput = document.querySelector(btn.getAttribute('data-send-sms'));
      if (phoneInput && (!/^1\d{10}$/.test(phoneInput.value))) {
        toast('请输入有效的手机号', 'warning');
        if (phoneInput) phoneInput.focus();
        return;
      }
      toast('验证码已发送（原型演示）', 'success');
      var n = 60;
      var originalText = btn.dataset.originalText || btn.textContent;
      btn.dataset.originalText = originalText;
      btn.disabled = true;
      btn.textContent = n + ' 秒后重发';
      var t = setInterval(function () {
        n -= 1;
        btn.textContent = n + ' 秒后重发';
        if (n <= 0) {
          clearInterval(t);
          btn.disabled = false;
          btn.textContent = originalText;
        }
      }, 1000);
    });
  });

  /* ---------- 后台：状态 select 即时反馈 ---------- */
  document.querySelectorAll('.status-cell select').forEach(function (sel) {
    sel.addEventListener('change', function () {
      toast('状态已更新为「' + sel.value + '」', 'success');
    });
  });

  /* ---------- 后台：表格全选 ---------- */
  document.querySelectorAll('thead input[type=checkbox][aria-label="全选"]').forEach(function (h) {
    h.addEventListener('change', function () {
      var table = h.closest('table');
      if (!table) return;
      table.querySelectorAll('tbody input[type=checkbox]').forEach(function (cb) { cb.checked = h.checked; });
    });
  });

  /* ---------- 筛选按钮组 toggle ---------- */
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    group.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        group.querySelectorAll('.btn').forEach(function (b) {
          b.classList.remove('btn--primary');
          b.classList.add('btn--ghost');
        });
        btn.classList.remove('btn--ghost');
        btn.classList.add('btn--primary');
      });
    });
  });

  /* ---------- 输入失焦校验手机号 / 邮箱 ---------- */
  document.addEventListener('blur', function (e) {
    var t = e.target;
    if (!t.matches) return;
    if (t.matches('input[type=tel], input[name=phone]')) {
      if (t.value && !/^1\d{10}$/.test(t.value)) {
        t.setCustomValidity('手机号格式不正确');
        t.style.borderColor = 'var(--danger-500)';
      } else {
        t.setCustomValidity('');
        t.style.borderColor = '';
      }
    }
    if (t.matches('input[type=email]')) {
      if (t.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.value)) {
        t.setCustomValidity('邮箱格式不正确');
        t.style.borderColor = 'var(--danger-500)';
      } else {
        t.setCustomValidity('');
        t.style.borderColor = '';
      }
    }
  }, true);
})();
