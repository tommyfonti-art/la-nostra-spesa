/* Accesso con email e password (Firebase, via REST) per le app che salvano su Firestore senza l'SDK.
   Prima di caricare l'app va definito window.ACCESSO = { apiKey, progetto, titolo }.
   Espone accessoToken(forza): promessa con il token da mandare a Firestore. */
(function(){
  var C = window.ACCESSO || {};
  var CHIAVE = 'accesso_sessione_' + C.progetto;
  var AUTH = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  var TOKEN_URL = 'https://securetoken.googleapis.com/v1/token?key=' + C.apiKey;
  var sessione = null;
  try{ var r = localStorage.getItem(CHIAVE); if(r){ var x = JSON.parse(r); if(x && x.refreshToken) sessione = x; } }catch(e){}
  function salva(x){ sessione = x; try{ if(x) localStorage.setItem(CHIAVE, JSON.stringify(x)); else localStorage.removeItem(CHIAVE); }catch(e){} }
  function errore(c){
    c = String(c || '').split(' ')[0].split(':')[0];
    var m = {
      INVALID_EMAIL:'L’email non sembra giusta.', MISSING_EMAIL:'Scrivi la tua email.', MISSING_PASSWORD:'Scrivi la password.',
      INVALID_LOGIN_CREDENTIALS:'Email o password sbagliate.', INVALID_PASSWORD:'Email o password sbagliate.', EMAIL_NOT_FOUND:'Email o password sbagliate.',
      USER_DISABLED:'Questo account è stato disattivato.', TOO_MANY_ATTEMPTS_TRY_LATER:'Troppi tentativi. Aspetta qualche minuto e riprova.',
      OPERATION_NOT_ALLOWED:'L’accesso con email non è ancora attivo sul server.', network:'Non riesco a collegarmi: controlla la connessione.'
    };
    return m[c] || 'Qualcosa è andato storto. Riprova tra poco.';
  }
  function post(metodo, corpo){
    return fetch(AUTH + metodo + '?key=' + C.apiKey, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(corpo) })
      .then(function(res){
        return res.json().then(function(j){
          if(!res.ok){ var e = new Error('auth'); e.code = (j && j.error && j.error.message) || 'error'; throw e; }
          return j;
        });
      }, function(){ var en = new Error('network'); en.code = 'network'; throw en; });
  }
  var rinnovo = null;
  window.accessoToken = function(forza){
    if(!sessione){ var e0 = new Error('no-session'); e0.code = 'no-session'; return Promise.reject(e0); }
    if(!forza && sessione.scade - Date.now() > 60000) return Promise.resolve(sessione.idToken);
    if(rinnovo) return rinnovo;
    rinnovo = fetch(TOKEN_URL, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:'grant_type=refresh_token&refresh_token=' + encodeURIComponent(sessione.refreshToken) })
      .then(function(res){
        return res.json().then(function(j){
          if(!res.ok){ var e = new Error('refresh'); e.code = (j && j.error && j.error.message) || 'error'; throw e; }
          return j;
        });
      }, function(){ var en = new Error('network'); en.code = 'network'; throw en; })
      .then(function(j){
        salva({ idToken:j.id_token, refreshToken:j.refresh_token, email:sessione.email, scade:Date.now() + (parseInt(j.expires_in,10) || 3600) * 1000 });
        rinnovo = null; return sessione.idToken;
      }, function(err){
        rinnovo = null;
        var c = err && err.code;
        if(c === 'TOKEN_EXPIRED' || c === 'INVALID_REFRESH_TOKEN' || c === 'USER_NOT_FOUND' || c === 'USER_DISABLED'){ salva(null); location.reload(); }
        throw err;
      });
    return rinnovo;
  };
  window.esciDallAccount = function(){ salva(null); location.reload(); };
  function mostra(){
    var st = document.createElement('style');
    st.textContent = '#acc-vel{position:fixed;inset:0;z-index:99999;background:#f4f1ea;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,system-ui,sans-serif}'
      + '#acc-vel form{width:100%;max-width:340px;background:#fff;border:1px solid #ddd6c8;border-radius:16px;padding:22px;box-shadow:0 6px 24px rgba(0,0,0,.08)}'
      + '#acc-vel h2{margin:0 0 4px;font-size:20px;color:#222}#acc-vel p{margin:0 0 14px;font-size:14px;color:#666}'
      + '#acc-vel input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:12px;font-size:16px;border:1px solid #ddd6c8;border-radius:10px;background:#faf8f3;color:#222}'
      + '#acc-vel button{width:100%;padding:12px;font-size:16px;font-weight:600;border:0;border-radius:10px;background:#5f7f59;color:#fff}'
      + '#acc-vel .acc-link{background:none;color:#5f7f59;font-size:14px;font-weight:500;margin-top:8px}'
      + '#acc-vel .acc-pw-box{position:relative}#acc-vel .acc-pw-box input{padding-right:48px}#acc-vel .acc-occhio{position:absolute;right:4px;top:3px;width:42px;height:42px;padding:0;margin:0;background:none;border:0;color:#7a7a7a;display:flex;align-items:center;justify-content:center;cursor:pointer}'
      + '#acc-vel .acc-msg{min-height:20px;margin:8px 0 0;font-size:14px;color:#c0392b}';
    document.head.appendChild(st);
    var v = document.createElement('div'); v.id = 'acc-vel';
    v.innerHTML = '<form id="acc-form"><h2>' + (C.titolo || 'Accedi') + '</h2><p>Accedi con la tua email e la tua password.</p>'
      + '<input id="acc-email" name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Email" required>'
      + '<div class="acc-pw-box"><input id="acc-pw" name="password" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Password" required><button type="button" class="acc-occhio" id="acc-occhio" aria-label="Mostra la password"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div>'
      + '<button type="submit" id="acc-vai">Accedi</button>'
      + '<button type="button" class="acc-link" id="acc-reset">Password dimenticata?</button>'
      + '<div class="acc-msg" id="acc-msg"></div></form>';
    document.body.appendChild(v);
    var occ=document.getElementById('acc-occhio');if(occ)occ.addEventListener('click',function(){var p=document.getElementById('acc-pw');var vedo=p.type==='password';p.type=vedo?'text':'password';occ.innerHTML=vedo?'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.7-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>':'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';occ.setAttribute('aria-label',vedo?'Nascondi la password':'Mostra la password');p.focus();});
    document.getElementById('acc-reset').addEventListener('click', function(){
      var msg = document.getElementById('acc-msg'), em = document.getElementById('acc-email').value.trim();
      if(!em){ msg.style.color = '#c0392b'; msg.textContent = 'Scrivi prima la tua email.'; return; }
      post('sendOobCode', { requestType:'PASSWORD_RESET', email:em }).then(function(){
        msg.style.color = '#2f9a4a'; msg.textContent = 'Ti ho mandato una email per scegliere una password nuova.';
      }, function(er){ msg.style.color = '#c0392b'; msg.textContent = errore(er && er.code); });
    });
    document.getElementById('acc-form').addEventListener('submit', function(e){
      e.preventDefault();
      var msg = document.getElementById('acc-msg'), b = document.getElementById('acc-vai');
      msg.style.color = '#c0392b'; msg.textContent = ''; b.disabled = true; b.textContent = 'Attendi…';
      var em = document.getElementById('acc-email').value.trim();
      post('signInWithPassword', { email:em, password:document.getElementById('acc-pw').value, returnSecureToken:true }).then(function(j){
        salva({ idToken:j.idToken, refreshToken:j.refreshToken, email:j.email || em, scade:Date.now() + (parseInt(j.expiresIn,10) || 3600) * 1000 });
        // il modulo sparisce prima di ricaricare: così Safari propone di salvare la password nel portachiavi
        v.style.display = 'none';
        setTimeout(function(){ location.reload(); }, 700);
      }, function(er){ msg.textContent = errore(er && er.code); b.disabled = false; b.textContent = 'Accedi'; });
    });
  }
  if(!sessione){
    if(document.body) mostra(); else document.addEventListener('DOMContentLoaded', mostra);
  }
})();
