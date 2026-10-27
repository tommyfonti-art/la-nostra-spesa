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
      + '#acc-vel .acc-msg{min-height:20px;margin:8px 0 0;font-size:14px;color:#c0392b}';
    document.head.appendChild(st);
    var v = document.createElement('div'); v.id = 'acc-vel';
    v.innerHTML = '<form id="acc-form"><h2>' + (C.titolo || 'Accedi') + '</h2><p>Accedi con la tua email e la tua password.</p>'
      + '<input id="acc-email" type="email" autocomplete="username" placeholder="Email" required>'
      + '<input id="acc-pw" type="password" autocomplete="current-password" placeholder="Password" required>'
      + '<button type="submit" id="acc-vai">Accedi</button><div class="acc-msg" id="acc-msg"></div></form>';
    document.body.appendChild(v);
    document.getElementById('acc-form').addEventListener('submit', function(e){
      e.preventDefault();
      var msg = document.getElementById('acc-msg'), b = document.getElementById('acc-vai');
      msg.textContent = ''; b.disabled = true; b.textContent = 'Attendi…';
      var em = document.getElementById('acc-email').value.trim();
      post('signInWithPassword', { email:em, password:document.getElementById('acc-pw').value, returnSecureToken:true }).then(function(j){
        salva({ idToken:j.idToken, refreshToken:j.refreshToken, email:j.email || em, scade:Date.now() + (parseInt(j.expiresIn,10) || 3600) * 1000 });
        location.reload();
      }, function(er){ msg.textContent = errore(er && er.code); b.disabled = false; b.textContent = 'Accedi'; });
    });
  }
  if(!sessione){
    if(document.body) mostra(); else document.addEventListener('DOMContentLoaded', mostra);
  }
})();
