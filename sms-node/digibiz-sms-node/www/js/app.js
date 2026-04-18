/**
 * DigiBiz SMS Node — email/password only; businessId resolved from Firestore.
 */
import { Capacitor } from '@capacitor/core';
import { SmsManager } from '@byteowls/capacitor-sms';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  updateDoc,
  setDoc,
  serverTimestamp,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBLFefSjFXp84Hg7nnIfuJ18SFcM92bsno',
  authDomain: 'digibiz-sys.firebaseapp.com',
  projectId: 'digibiz-sys',
  storageBucket: 'digibiz-sys.firebasestorage.app',
  messagingSenderId: '761278318158',
  appId: '1:761278318158:web:f4451f5cf5f8762192a51f',
};

const LS_BIZ = 'digibiz_sms_gateway_business_id';
const LS_BIZ_NAME = 'digibiz_sms_gateway_business_name';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const panelLogin = document.getElementById('panelLogin');
const panelActive = document.getElementById('panelActive');
const bizLine = document.getElementById('bizLine');
const logEl = document.getElementById('log');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');

let unsubscribePending = null;
const processing = new Set();

function log(...args) {
  const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  console.log('[DigiBiz SMS]', ...args);
  logEl.textContent = `${new Date().toISOString().slice(11, 19)} ${line}\n${logEl.textContent}`.slice(0, 4000);
}

function showLogin() {
  panelLogin.classList.remove('hidden');
  panelActive.classList.add('hidden');
}

function showActive(businessId, businessName) {
  panelLogin.classList.add('hidden');
  panelActive.classList.remove('hidden');
  const label = businessName ? String(businessName) : 'Business';
  bizLine.innerHTML = `<strong>${escapeHtml(label)}</strong><br><code>${escapeHtml(businessId)}</code>`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stopListener() {
  if (unsubscribePending) {
    unsubscribePending();
    unsubscribePending = null;
  }
}

function pickBiz(snap) {
  if (!snap.exists) return null;
  const d = snap.data() || {};
  return { id: snap.id, name: d.name || d.businessName || '' };
}

/**
 * Resolve tenant from users/{uid} and businesses (owner / doc id).
 */
async function resolveBusinessId(uid) {
  const userSnap = await getDoc(doc(db, 'users', uid));
  const userData = userSnap.exists ? userSnap.data() : {};
  const fromUser = userData.businessId ? String(userData.businessId).trim() : '';

  if (fromUser) {
    const bizSnap = await getDoc(doc(db, 'businesses', fromUser));
    if (bizSnap.exists) return pickBiz(bizSnap);
    const qOwner = query(collection(db, 'businesses'), where('ownerId', '==', uid), limit(5));
    const snapQ = await getDocs(qOwner);
    if (!snapQ.empty) return pickBiz(snapQ.docs[0]);
    const selfSnap = await getDoc(doc(db, 'businesses', uid));
    return pickBiz(selfSnap);
  }

  const qOwner = query(collection(db, 'businesses'), where('ownerId', '==', uid), limit(5));
  const snapQ = await getDocs(qOwner);
  if (!snapQ.empty) return pickBiz(snapQ.docs[0]);
  const selfSnap = await getDoc(doc(db, 'businesses', uid));
  if (selfSnap.exists) return pickBiz(selfSnap);
  return null;
}

async function sendWithPlugin(mobile, message) {
  const numbers = [String(mobile || '').replace(/\s/g, '')].filter(Boolean);
  if (!numbers[0]) throw new Error('empty mobile');
  await SmsManager.send({
    numbers,
    text: String(message || ''),
  });
}

async function handlePendingDoc(d) {
  const id = d.id;
  if (processing.has(id)) return;
  const data = d.data();
  if (data.status !== 'pending') return;

  processing.add(id);
  const mobile = data.mobile;
  const message = data.message;
  await setDoc(doc(db, 'sms_logs', id), {
    id,
    businessId: data.businessId || '',
    mobile: mobile || '',
    message: message || '',
    status: 'processing',
    deliverySource: 'sms-node-web-gateway',
    updatedAt: serverTimestamp(),
  }, { merge: true }).catch(() => {});
  log('Sending SMS doc', id, '→', mobile);

  try {
    if (Capacitor.getPlatform() === 'web') {
      log('Skip send on web; not marking sent');
      throw new Error('WEB_PLATFORM');
    }
    await sendWithPlugin(mobile, message);
    await updateDoc(doc(db, 'pending_sms', id), {
      status: 'sent',
      sentAt: serverTimestamp(),
      deliverySource: 'sms-node-web-gateway',
    });
    await setDoc(doc(db, 'sms_logs', id), {
      id,
      businessId: data.businessId || '',
      mobile: mobile || '',
      message: message || '',
      status: 'sent',
      sentAt: serverTimestamp(),
      deliverySource: 'sms-node-web-gateway',
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch(() => {});
    log('Updated', id, '→ sent');
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    if (msg !== 'WEB_PLATFORM') {
      log('Send/update failed', id, msg);
      await updateDoc(doc(db, 'pending_sms', id), {
        status: 'failed',
        errorMessage: msg,
        failedAt: serverTimestamp(),
        deliverySource: 'sms-node-web-gateway',
      }).catch(() => {});
      await setDoc(doc(db, 'sms_logs', id), {
        id,
        businessId: data.businessId || '',
        mobile: mobile || '',
        message: message || '',
        status: 'failed',
        errorMessage: msg,
        failedAt: serverTimestamp(),
        deliverySource: 'sms-node-web-gateway',
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }
  } finally {
    processing.delete(id);
  }
}

function startPendingListener(businessId) {
  stopListener();
  if (!businessId) {
    log('Missing business id');
    return;
  }

  const q = query(
    collection(db, 'pending_sms'),
    where('businessId', '==', businessId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
  );

  unsubscribePending = onSnapshot(
    q,
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added' && change.type !== 'modified') return;
        const d = change.doc;
        const row = d.data();
        if (row.status !== 'pending') return;
        void handlePendingDoc(d);
      });
    },
    (err) => {
      log('Listener error', err.code || '', err.message || err);
      showLogin();
    }
  );

  log('Listening pending_sms businessId=', businessId);
}

async function afterAuth(user) {
  if (!user) {
    stopListener();
    processing.clear();
    showLogin();
    return;
  }

  signInBtn.disabled = true;
  try {
    const biz = await resolveBusinessId(user.uid);
    if (!biz || !biz.id) {
      log('No business found for this account. Set business on your DigiBiz user profile.');
      showLogin();
      return;
    }
    localStorage.setItem(LS_BIZ, biz.id);
    localStorage.setItem(LS_BIZ_NAME, biz.name || '');
    startPendingListener(biz.id);
    showActive(biz.id, biz.name);
  } catch (e) {
    log('Resolve business failed', e && e.message ? e.message : e);
    showLogin();
  } finally {
    signInBtn.disabled = false;
  }
}

signInBtn.addEventListener('click', async () => {
  const email = String(emailInput.value || '').trim();
  const password = String(passwordInput.value || '');
  if (!email || !password) {
    log('Enter email and password');
    return;
  }
  signInBtn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    log('Sign-in failed', e.code || '', e.message || e);
  } finally {
    signInBtn.disabled = false;
  }
});

signOutBtn.addEventListener('click', async () => {
  stopListener();
  processing.clear();
  try {
    localStorage.removeItem(LS_BIZ);
    localStorage.removeItem(LS_BIZ_NAME);
  } catch {
    /* ignore */
  }
  await signOut(auth);
  log('Signed out');
  showLogin();
});

onAuthStateChanged(auth, (user) => {
  void afterAuth(user);
});

showLogin();
log('Ready. Platform:', Capacitor.getPlatform());
