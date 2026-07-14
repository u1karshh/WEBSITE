const databaseName = 'world-cup-match-centre';
const databaseVersion = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
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
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecord(storeName, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function encode(buffer) { return btoa(String.fromCharCode(...new Uint8Array(buffer))); }
async function hashPassword(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(atob(salt), c => c.charCodeAt(0)), iterations: 100000, hash: 'SHA-256' }, material, 256);
  return encode(bits);
}

const currentUser = () => JSON.parse(localStorage.getItem('wc26-user') || 'null');
const setUser = user => localStorage.setItem('wc26-user', JSON.stringify({ email: user.email, name: user.name }));
const clearUser = () => localStorage.removeItem('wc26-user');

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.querySelector('#account-modal');
  const form = document.querySelector('#account-form');
  const trigger = document.querySelector('#account-trigger');
  const modeButton = document.querySelector('#account-mode');
  const message = document.querySelector('#account-message');
  const nameField = document.querySelector('#account-name-field');
  let mode = 'signin';

  function paintUser() {
    const user = currentUser();
    trigger.textContent = user ? `Hi, ${user.name.split(' ')[0]}` : 'Sign in';
    trigger.classList.toggle('signed-in', Boolean(user));
    document.querySelector('#prediction-login-note').hidden = Boolean(user);
    document.querySelector('#prediction-form').hidden = !user;
    if (user) loadPrediction(user.email);
  }
  function setMode(nextMode) {
    mode = nextMode;
    const register = mode === 'register';
    nameField.hidden = !register;
    document.querySelector('#account-submit').textContent = register ? 'Create account' : 'Sign in';
    modeButton.textContent = register ? 'Already have an account? Sign in' : 'New here? Create an account';
    message.textContent = '';
  }
  function openModal() { modal.showModal(); setMode(currentUser() ? 'signin' : mode); }

  trigger.addEventListener('click', () => currentUser() ? (clearUser(), paintUser()) : openModal());
  document.querySelector('#account-close').addEventListener('click', () => modal.close());
  modeButton.addEventListener('click', () => setMode(mode === 'signin' ? 'register' : 'signin'));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const password = form.elements.password.value;
    try {
      if (mode === 'register') {
        if (name.length < 2) throw new Error('Please enter your name.');
        if (await getRecord('accounts', email)) throw new Error('An account already exists for this email.');
        const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
        await saveRecord('accounts', { email, name, salt, passwordHash: await hashPassword(password, salt), createdAt: new Date().toISOString() });
        setUser({ email, name });
      } else {
        const account = await getRecord('accounts', email);
        if (!account || await hashPassword(password, account.salt) !== account.passwordHash) throw new Error('Email or password is incorrect.');
        setUser(account);
      }
      form.reset(); modal.close(); paintUser();
    } catch (error) { message.textContent = error.message || 'Unable to access your account.'; }
  });

  async function loadPrediction(email) {
    const prediction = await getRecord('predictions', email);
    if (!prediction) return;
    document.querySelector('#home-prediction').value = prediction.home;
    document.querySelector('#away-prediction').value = prediction.away;
    document.querySelector('#star-prediction').value = prediction.star;
    document.querySelector('#prediction-status').textContent = 'Your saved call is ready for kick-off.';
  }
  document.querySelector('#prediction-form').addEventListener('submit', async event => {
    event.preventDefault();
    const user = currentUser();
    if (!user) return openModal();
    await saveRecord('predictions', { email: user.email, home: document.querySelector('#home-prediction').value, away: document.querySelector('#away-prediction').value, star: document.querySelector('#star-prediction').value, updatedAt: new Date().toISOString() });
    document.querySelector('#prediction-status').textContent = 'Prediction saved — back your call.';
  });
  paintUser();
});
