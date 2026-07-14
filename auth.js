const databaseName = 'world-cup-match-centre';
const adminEmail = 'utkarshabahl@gmail.com';
const adminPassword = 'ADMIN';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('accounts')) db.createObjectStore('accounts', { keyPath: 'email' });
      if (!db.objectStoreNames.contains('predictions')) db.createObjectStore('predictions', { keyPath: 'email' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function getRecord(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => { const request = db.transaction(storeName).objectStore(storeName).get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
async function getAllRecords(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => { const request = db.transaction(storeName).objectStore(storeName).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
async function saveRecord(storeName, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => { const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}
async function deleteRecord(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => { const request = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}
function encode(buffer) { return btoa(String.fromCharCode(...new Uint8Array(buffer))); }
async function hashPassword(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(atob(salt), c => c.charCodeAt(0)), iterations: 100000, hash: 'SHA-256' }, material, 256);
  return encode(bits);
}
async function resetPassword(account, password) {
  const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
  account.salt = salt;
  account.passwordHash = await hashPassword(password, salt);
}
async function ensureAdmin() {
  const existing = await getRecord('accounts', adminEmail);
  if (existing) { existing.role = 'admin'; await saveRecord('accounts', existing); return; }
  const admin = { email: adminEmail, name: 'Utkarsh Bahl', role: 'admin', createdAt: new Date().toISOString() };
  await resetPassword(admin, adminPassword);
  await saveRecord('accounts', admin);
}
const currentUser = () => JSON.parse(localStorage.getItem('wc26-user') || 'null');
const setUser = user => localStorage.setItem('wc26-user', JSON.stringify({ email: user.email, name: user.name, role: user.role || 'member' }));
const clearUser = () => localStorage.removeItem('wc26-user');

document.addEventListener('DOMContentLoaded', async () => {
  const modal = document.querySelector('#account-modal');
  const form = document.querySelector('#account-form');
  const trigger = document.querySelector('#account-trigger');
  const modeButton = document.querySelector('#account-mode');
  const message = document.querySelector('#account-message');
  const nameField = document.querySelector('#account-name-field');
  const adminPanel = document.querySelector('#admin-panel');
  let mode = 'signin';

  function isAdmin() { return currentUser()?.role === 'admin'; }
  async function loadPrediction(email) {
    const prediction = await getRecord('predictions', email);
    if (!prediction) return;
    document.querySelector('#home-prediction').value = prediction.home;
    document.querySelector('#away-prediction').value = prediction.away;
    document.querySelector('#star-prediction').value = prediction.star;
    document.querySelector('#prediction-status').textContent = 'Your saved call is ready for kick-off.';
  }
  async function paintUser() {
    const user = currentUser();
    trigger.textContent = user ? (isAdmin() ? 'Admin console' : `Hi, ${user.name.split(' ')[0]}`) : 'Sign in';
    trigger.classList.toggle('signed-in', Boolean(user));
    adminPanel.hidden = !isAdmin();
    document.querySelector('#prediction-login-note').hidden = Boolean(user);
    document.querySelector('#prediction-form').hidden = !user;
    if (user) await loadPrediction(user.email);
    if (isAdmin()) await renderAccounts();
  }
  function setMode(nextMode) {
    mode = nextMode; const register = mode === 'register';
    nameField.hidden = !register;
    document.querySelector('#account-submit').textContent = register ? 'Create account' : 'Sign in';
    modeButton.textContent = register ? 'Already have an account? Sign in' : 'New here? Create an account'; message.textContent = '';
  }
  function openModal() { modal.showModal(); setMode(mode); }
  trigger.addEventListener('click', () => isAdmin() ? adminPanel.scrollIntoView({ behavior: 'smooth' }) : currentUser() ? (clearUser(), paintUser()) : openModal());
  document.querySelector('#account-close').addEventListener('click', () => modal.close());
  modeButton.addEventListener('click', () => setMode(mode === 'signin' ? 'register' : 'signin'));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = form.elements.name.value.trim(), email = form.elements.email.value.trim().toLowerCase(), password = form.elements.password.value;
    try {
      if (mode === 'register') {
        if (name.length < 2) throw new Error('Please enter your name.');
        if (password.length < 8) throw new Error('Please use a password with at least 8 characters.');
        if (await getRecord('accounts', email)) throw new Error('An account already exists for this email.');
        const account = { email, name, role: 'member', createdAt: new Date().toISOString() }; await resetPassword(account, password); await saveRecord('accounts', account); setUser(account);
      } else {
        const account = await getRecord('accounts', email);
        if (!account || await hashPassword(password, account.salt) !== account.passwordHash) throw new Error('Email or password is incorrect.');
        setUser(account);
      }
      form.reset(); modal.close(); await paintUser();
    } catch (error) { message.textContent = error.message || 'Unable to access your account.'; }
  });
  document.querySelector('#prediction-form').addEventListener('submit', async event => {
    event.preventDefault(); const user = currentUser(); if (!user) return openModal();
    await saveRecord('predictions', { email: user.email, home: document.querySelector('#home-prediction').value, away: document.querySelector('#away-prediction').value, star: document.querySelector('#star-prediction').value, updatedAt: new Date().toISOString() });
    document.querySelector('#prediction-status').textContent = 'Prediction saved — back your call.';
  });

  async function renderAccounts() {
    const accounts = await getAllRecords('accounts');
    const select = document.querySelector('#admin-account-select');
    const chosen = select.value || accounts[0]?.email;
    select.innerHTML = accounts.map(account => `<option value="${account.email}">${account.name} — ${account.email}${account.role === 'admin' ? ' (admin)' : ''}</option>`).join('');
    if (chosen && accounts.some(account => account.email === chosen)) select.value = chosen;
    await loadAdminRecord(select.value);
  }
  async function loadAdminRecord(email) {
    if (!email) return;
    const account = await getRecord('accounts', email), prediction = await getRecord('predictions', email);
    document.querySelector('#admin-original-email').value = account.email;
    document.querySelector('#admin-name').value = account.name;
    document.querySelector('#admin-email').value = account.email;
    document.querySelector('#admin-role').value = account.role || 'member';
    document.querySelector('#admin-home').value = prediction?.home ?? '0';
    document.querySelector('#admin-away').value = prediction?.away ?? '0';
    document.querySelector('#admin-star').value = prediction?.star ?? 'Kylian Mbappé';
    document.querySelector('#admin-password').value = '';
  }
  document.querySelector('#admin-account-select').addEventListener('change', event => loadAdminRecord(event.target.value));
  document.querySelector('#admin-form').addEventListener('submit', async event => {
    event.preventDefault();
    const originalEmail = document.querySelector('#admin-original-email').value, email = document.querySelector('#admin-email').value.trim().toLowerCase();
    const account = await getRecord('accounts', originalEmail);
    if (!account || !email) return;
    if (email !== originalEmail && await getRecord('accounts', email)) return document.querySelector('#admin-status').textContent = 'That email is already in use.';
    account.email = email; account.name = document.querySelector('#admin-name').value.trim(); account.role = document.querySelector('#admin-role').value;
    const password = document.querySelector('#admin-password').value;
    if (password) { if (password.length < 8) return document.querySelector('#admin-status').textContent = 'Use at least 8 characters for a reset password.'; await resetPassword(account, password); }
    if (email !== originalEmail) { await deleteRecord('accounts', originalEmail); await deleteRecord('predictions', originalEmail); }
    await saveRecord('accounts', account);
    await saveRecord('predictions', { email, home: document.querySelector('#admin-home').value, away: document.querySelector('#admin-away').value, star: document.querySelector('#admin-star').value, updatedAt: new Date().toISOString() });
    if (currentUser()?.email === originalEmail) setUser(account);
    document.querySelector('#admin-status').textContent = 'Account and prediction saved.'; await paintUser();
  });
  document.querySelector('#admin-delete').addEventListener('click', async () => {
    const email = document.querySelector('#admin-original-email').value;
    if (email === adminEmail) return document.querySelector('#admin-status').textContent = 'The primary admin account cannot be deleted.';
    await deleteRecord('accounts', email); await deleteRecord('predictions', email); document.querySelector('#admin-status').textContent = 'Account deleted.'; await renderAccounts();
  });
  await ensureAdmin(); await paintUser();

  // Admin Quick Login
  const quickLoginButton = document.createElement('button');
  quickLoginButton.id = 'admin-quick-login-trigger';
  quickLoginButton.textContent = 'Admin Quick Login';
  document.querySelector('#account-trigger').insertAdjacentElement('afterend', quickLoginButton);

  quickLoginButton.addEventListener('click', async () => {
    const password = prompt('Enter admin quick-login password:');
    if (password === '123') {
      const adminAccount = await getRecord('accounts', adminEmail);
      if (adminAccount) {
        setUser(adminAccount);
        await paintUser();
        showToast('Admin login successful.');
      } else {
        showToast('Admin account not found.');
      }
    } else if (password !== null) { // only show if user entered something and it was wrong
      showToast('Incorrect password.');
    }
  });
});
