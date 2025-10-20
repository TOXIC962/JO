(function(){
  'use strict';
  console.clear();
  console.log('%c🔵 Reveal-Blue + Reliable WS Actions (patch)','color:#2b9be0;font-weight:bold;');

  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const q = (s, r=document) => r.querySelector(s);
  const qq = (s, r=document) => Array.from(r.querySelectorAll(s));

  // ======= العثور على WebSocket(s) المرتبطة بـ socket.io =======
  function findWS(){
    const arr=[];
    for(const k in window){
      try{
        const v = window[k];
        if(v instanceof WebSocket && typeof v.url === 'string' && v.url.includes('socket.io')) arr.push(v);
      }catch(e){}
    }
    return arr;
  }

  // ======= إرسال إطار مطابق لبنية الموقع (raw frame) =======
  function sendFrameRaw(cmd, dataObj){
    const wsList = findWS();
    if(!wsList.length){
      console.warn('⚠️ لم يُعثر على WebSocket. تأكد أن الصفحة متصلة.');
      return false;
    }
    // شكل payload كما رصدناه في سجلاتك
    const payload = { cmd: 'ccvimn', data: Object.assign({cmd}, dataObj || {}) };
    const frame = '42' + JSON.stringify(['msg', payload]);
    wsList.forEach(ws => { try{ if(ws.readyState === 1) ws.send(frame); }catch(e){ console.warn('WS send failed', e); } });
    console.log('📡 WS send ->', frame);
    return true;
  }

  // واجهة مساعدة: استدعاءات شائعة
  function actionOpen(id){ return sendFrameRaw('upro', { id }); }
  function actionLike(id){ return sendFrameRaw('like', { id }); }
  function actionNotif(id, msg='.'){ return sendFrameRaw('not', { id, msg }); }
  function actionPM(id, msg='.\n'){ return sendFrameRaw('rm', { id, msg }); }
  // بعض مواقع ترسل dmsg/mi بدلاً من rm — نترك fallback إن لزم.

  // ======= استخلاص ID من العنصر =======
  function extractId(el){
    try{
      const on = el.getAttribute && el.getAttribute('onclick');
      if(on){
        const m = on.match(/upro\(['"]([^'"]+)['"]\)/);
        if(m) return m[1];
      }
    }catch(e){}
    // فحص الكلاسات uid...
    if(el.classList) for(const c of el.classList) if(/^uid/.test(c)) return c.replace(/^uid/,'');
    return null;
  }

  // ======= هل العنصر مخفي فعلًا =======
  function isHiddenUser(el){
    try{
      const s = getComputedStyle(el);
      if(s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity||'1')===0) return true;
      if(el.hasAttribute('hidden')) return true;
      if(el.classList.contains('hidden')||el.classList.contains('hide')) return true;
      if(el.offsetHeight===0 || el.offsetWidth===0) return true;
      return false;
    }catch(e){ return false; }
  }

  // ======= هل حالة الصورة ليست من قائمة الصور s0..s3 (أي: الأزرق) =======
  function hasBlueStatus(el){
    try{
      const img = el.querySelector('div > div.d-flex.fl > img');
      if(!img) return false;
      const src = img.getAttribute('src') || '';
      const forbidden = ['imgs/s0', 'imgs/s1', 'imgs/s2', 'imgs/s3'];
      return !forbidden.some(f => src.includes(f));
    }catch(e){ return false; }
  }

  // ======= جعل المودال الأصلي قابل للإغلاق بشكل آمن =======
  function ensureModalClosable(){
    const modal = q('#upro');
    if(!modal) return;
    if(modal.dataset.revealCloseBound) return;
    modal.dataset.revealCloseBound = '1';
    // زِد التأكيد على أن إغلاقه يزيل class/modal backdrop
    const closeBtn = modal.querySelector('.modal-header .clickable, .fa-times, .modal .close');
    if(closeBtn){
      closeBtn.addEventListener('click', ev => {
        try{
          modal.style.display = 'none';
          modal.classList.remove('in','active','show');
          // إزالة أي backdrop مؤقت
          document.querySelectorAll('.modal-backdrop').forEach(x=>x.remove());
          toast('✅ تم إغلاق الواجهة الأصلية');
        }catch(e){}
      });
    }
  }

  // ======= إشعارات مصغرة =======
  let toastTimer = null;
  function toast(msg, color='#4caf50'){
    let el = q('#__reveal_toast');
    if(!el){
      el = document.createElement('div');
      el.id = '__reveal_toast';
      Object.assign(el.style,{
        position:'fixed', right:'20px', bottom:'20px', zIndex:9999999,
        background: color, color:'#fff', padding:'8px 12px', borderRadius:'6px',
        fontFamily:'Cairo, sans-serif', boxShadow: '0 6px 18px rgba(0,0,0,0.2)'
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    if(toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>{ el.style.opacity = '0'; }, 2200);
  }

  // ======= انتظار مودال الupro وتهيئته (ربط الأزرار ليُرسِلوا عبر WS) =======
  async function waitAndBindModalFor(userId, timeout = 3000){
    const start = Date.now();
    while(Date.now() - start < timeout){
      const modal = q('#upro');
      if(modal){
        // تأكد أنه ظاهر
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = 9999999;
        ensureModalClosable();

        // ربط أزرار اللايك/التنبيه/المحادثة ليرسلوا عبر WS بنفس معرف userId
        try{
          // Like
          const likeBtn = modal.querySelector('.fa-heart.btn.ulike');
          if(likeBtn && !likeBtn.dataset.revealBound){
            likeBtn.dataset.revealBound = '1';
            likeBtn.addEventListener('click', ev => {
              ev.stopPropagation();
              // نرسل نفس إطار الموقع لبناء لايك حقيقي
              actionLike(userId);
              toast('❤️ أُرسل لايك عبر WebSocket');
            });
          }

          // Notif -> نفتح نافذة mmnot (الموجودة في DOM) ونربط زر الإرسال داخلها
          const notBtn = modal.querySelector('.fa-envelope-o.btn.unot');
          if(notBtn && !notBtn.dataset.revealBound){
            notBtn.dataset.revealBound = '1';
            notBtn.addEventListener('click', ev => {
              ev.stopPropagation();
              // انقر ليفتح النافذة الأصلية
              notBtn.click?.();
              // بعد فترة قصيرة حاول ربط زر الإرسال داخل mmnot
              setTimeout(()=>{
                const mm = q('#mmnot');
                if(mm){
                  const textarea = mm.querySelector('textarea');
                  const sendBtn = mm.querySelector('.rsave, .btn .fa-send') || mm.querySelector('button');
                  if(sendBtn && !sendBtn.dataset.revealBound){
                    sendBtn.dataset.revealBound = '1';
                    sendBtn.addEventListener('click', ()=> {
                      const txt = (textarea && textarea.value) ? textarea.value : '.';
                      actionNotif(userId, txt);
                      toast('✉️ تم إرسال التنبيه عبر WebSocket');
                      // إغلاق mmnot إذا احتجنا
                      if(mm && mm.parentElement) mm.parentElement.removeChild(mm);
                    });
                  }
                }
              }, 350);
            });
          }

          // PM -> فتح صندوق المحادثة ثم ربط زر الإرسال
          const pmBtn = modal.querySelector('.fa-comment.btn.upm');
          if(pmBtn && !pmBtn.dataset.revealBound){
            pmBtn.dataset.revealBound = '1';
            pmBtn.addEventListener('click', ev => {
              ev.stopPropagation();
              pmBtn.click?.();
              // بعد قليل، نربط صندوق الدردشة المفتوح
              setTimeout(()=>{
                // العنصر النشط للدردشة قد يحمل class .c-flex.bgg.border.w... .active
                const chat = document.querySelector('.c-flex.bgg.border.w199fe124266x0d498ae1-x-5p32u1.active') || document.querySelector('.c-flex.bgg.border.active');
                if(chat){
                  const textarea = chat.querySelector('textarea');
                  const sendBtn = chat.querySelector('.sndpm, .fa-send, button.fa-send, button.sndpm');
                  if(sendBtn && !sendBtn.dataset.revealBound){
                    sendBtn.dataset.revealBound = '1';
                    sendBtn.addEventListener('click', ()=> {
                      const txt = (textarea && textarea.value) ? textarea.value : '.\n';
                      actionPM(userId, txt);
                      toast('💬 تم إرسال رسالة خاصة عبر WebSocket');
                    });
                  }
                }
              }, 300);
            });
          }
        }catch(e){
          console.warn('⚠️ خطأ عند ربط أزرار المودال:', e);
        }

        return modal;
      }
      await sleep(120);
    }
    return null;
  }

  // ======= عرض وربط فقط المستخدمين المخفيين ذوي الحالة الزرقاء =======
  const shown = new Set();
  function revealHiddenBlueUsers(){
    const users = qq('#users .uzr, #users [class*="uid"]');
    users.forEach(user => {
      try{
        if(!isHiddenUser(user)) return;                 // نريد فقط المخفيين
        if(!hasBlueStatus(user)) return;                // ونريد فقط حالة مختلفة عن s0..s3 (أي الأزرق)
        const id = extractId(user);
        if(!id) return;

        // عرض بصري لطيف
        user.style.display = 'flex';
        user.style.visibility = 'visible';
        user.style.opacity = '1';
        user.style.border = '1px solid #2b9be0';
        user.style.boxShadow = '0 6px 18px rgba(43,155,224,0.12)';
        user.style.transition = 'all .25s ease';

        if(!shown.has(id)){
          shown.add(id);
          console.log('💠 كشف (أزرق) :', id);
        }

        // ربط النقر
        if(!user.dataset.revealBound){
          user.dataset.revealBound = '1';
          user.style.cursor = 'pointer';
          user.addEventListener('click', async ev => {
            ev.stopPropagation();
            console.log('🖱️ نقرت على مخفي أزرق:', id);
            actionOpen(id);                   // إرسال طلب فتح عبر WS
            toast('📂 جارٍ طلب الواجهة الأصلية...');
            const modal = await waitAndBindModalFor(id, 2500);
            if(modal){
              toast('✅ الواجهة الأصلية جاهزة');
              // ensure clickable buttons bound
            } else {
              // محاولة ثانية عبر إرسال الإطار بشكل مباشر وأنتظار
              actionOpen(id);
              const modal2 = await waitAndBindModalFor(id, 2500);
              if(modal2) toast('✅ تم فتح الواجهة بعد محاولة ثانية');
              else toast('⚠️ لم تظهر الواجهة — قد يحتاج الموقع وقتًا أو صيغ مختلفة');
            }
          });
        }
      }catch(e){ /* ignore per-element error */ }
    });
  }

  // ======= حلقة المراقبة =======
  revealHiddenBlueUsers();
  const interval = setInterval(revealHiddenBlueUsers, 1600);

  // export helpers للـ console
  window.__REVEAL = {
    findWS,
    sendFrameRaw,
    actionOpen, actionLike, actionNotif, actionPM,
    stop: ()=>{ clearInterval(interval); console.log('⏹️ stopped reveal loop'); }
  };

  toast('✅ جاهز — يظهر المخفيون باللون الأزرق فقط', '#2b9be0');
  console.log('✅ Reveal-Blue ready — use window.__REVEAL.actionLike(id) Programming and preparation Haz!m.');

})();
