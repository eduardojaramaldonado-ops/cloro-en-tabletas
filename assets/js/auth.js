(function() {
  'use strict';

  const USERS_KEY = 'cloroentabletas_users';
  const SESSION_KEY = 'cloroentabletas_session';
  const RECOVERY_KEY = 'cloroentabletas_recovery';

  function getUsers(){
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function saveUsers(arr){ localStorage.setItem(USERS_KEY, JSON.stringify(arr)); }

  function getSession(){
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch(e){ return null; }
  }
  function setSession(u){ localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  function register(data){
    const users = getUsers();
    if(users.find(u => u.email.toLowerCase() === data.email.toLowerCase())){
      throw new Error('Ya existe una cuenta registrada con este email');
    }
    users.push(data);
    saveUsers(users);
    setSession({ email: data.email, nombre: data.nombre, apellido: data.apellido });
  }

  function login(email, password){
    const users = getUsers();
    const user = users.find(u =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === password
    );
    if(!user) throw new Error('Email o contraseña incorrectos');
    setSession({ email: user.email, nombre: user.nombre, apellido: user.apellido });
    return user;
  }

  function logout(){ clearSession(); }

  function isAuth(){ return getSession() !== null; }

  function requestRecovery(email){
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if(!user) return false;
    const token = Math.random().toString(36).slice(2, 10).toUpperCase();
    localStorage.setItem(RECOVERY_KEY, JSON.stringify({ email: user.email, token: token, ts: Date.now() }));
    return token;
  }

  function renderAuthUI(){
    const session = getSession();
    document.querySelectorAll('.user-info').forEach(el => {
      const span = el.querySelector('span');
      if(!span) return;

      if(session){
        span.innerHTML = '<strong>¡Hola, ' + escapeHtml(session.nombre) + '!</strong>Mi Cuenta';
        el.dataset.authenticated = 'true';
      } else {
        if(el.dataset.authenticated){
          span.innerHTML = '<strong>¡Hola!</strong>Inicia sesión o regístrate';
          delete el.dataset.authenticated;
        }
      }
    });
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  document.addEventListener('DOMContentLoaded', function(){
    renderAuthUI();

    document.querySelectorAll('.user-info').forEach(el => {
      el.addEventListener('click', function(e){
        if(getSession()){
          e.preventDefault();
          if(confirm('¿Quieres cerrar sesión?')){
            logout();
            renderAuthUI();
            location.reload();
          }
        }
      });
    });
  });

  window.CloroAuth = {
    register: register,
    login: login,
    logout: logout,
    getSession: getSession,
    isAuth: isAuth,
    requestRecovery: requestRecovery
  };
})();
