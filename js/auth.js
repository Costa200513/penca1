import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// ─────────────────────────────────────────────────────────────────────────────
// ALTO-01 · NIST SP 800-63B / CIS 5.2 — Política de contraseñas reforzada
// ─────────────────────────────────────────────────────────────────────────────
const PASSWORD_MIN = 8;
const COMMON_PASSWORDS = [
  '12345678', 'password', 'qwerty123', 'futbol26', 'password1',
  '123456789', 'iloveyou', 'admin123', 'mundial26', 'penca2026',
];

function validatePassword(password) {
  if (password.length < PASSWORD_MIN)
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (COMMON_PASSWORDS.includes(password.toLowerCase()))
    return 'Esa contraseña es demasiado común. Elegí una más segura.';
  if (!/[A-Z]/.test(password))
    return 'La contraseña debe incluir al menos una letra mayúscula.';
  if (!/[0-9]/.test(password))
    return 'La contraseña debe incluir al menos un número.';
  return null; // null = válida
}

// ─────────────────────────────────────────────────────────────────────────────
// ALTO-02 · NIST AC-7 / CIS 13.9 — Rate-limiting de intentos de login
// (en memoria: se reinicia al recargar la página, suficiente para SPA)
// ─────────────────────────────────────────────────────────────────────────────
const loginAttempts = { count: 0, lockedUntil: 0 };
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 15 * 60 * 1000; // 15 minutos

// ─────────────────────────────────────────────────────────────────────────────
// MEDIO-01 · NIST SI-11 — No exponer stack traces en producción
// ─────────────────────────────────────────────────────────────────────────────
const IS_DEV = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
function devLog(...args) {
  if (IS_DEV) console.error(...args);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIO DE REGISTRO
// ─────────────────────────────────────────────────────────────────────────────
const registerForm = document.getElementById('registerForm');

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const msg = document.getElementById('registerMessage');
    msg.textContent = '';
    msg.className = 'inline-message';

    const username        = document.getElementById('username').value.trim().toLowerCase();
    const fullName        = document.getElementById('fullName').value.trim();
    const email           = document.getElementById('email').value.trim().toLowerCase();
    const password        = document.getElementById('password').value;
    const participantType = document.getElementById('participantType').value;
    const specialty       = document.getElementById('specialty').value.trim();
    const year            = document.getElementById('year').value;

    // Validar username (ya existía — ✅ BP-2)
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
      msg.textContent = 'El usuario debe tener entre 3 y 30 caracteres. Solo letras, números, punto y guion bajo.';
      msg.className = 'inline-message error';
      return;
    }

    // ALTO-01: Validación reforzada de contraseña
    const pwError = validatePassword(password);
    if (pwError) {
      msg.textContent = pwError;
      msg.className = 'inline-message error';
      return;
    }

    try {
      const usernameRef  = doc(db, 'usernames', username);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        msg.textContent = 'Ese nombre de usuario no está disponible.';
        msg.className = 'inline-message error';
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const batch = writeBatch(db);

      batch.set(doc(db, 'users', user.uid), {
        uid: user.uid,
        username,
        fullName,
        email,
        participantType,
        specialty,
        year,
        role: 'user',
        active: true,
        championId: '',
        championName: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(usernameRef, {
        uid: user.uid,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      // BAJO-01 · NIST IA-8 — Verificación de email tras registro
      await sendEmailVerification(user);

      // Cerrar sesión hasta que verifiquen el correo
      await signOut(auth);

      msg.className = 'inline-message success';
      msg.textContent =
        '¡Cuenta creada! Revisá tu correo para verificar tu dirección antes de ingresar.';
      registerForm.reset();
    } catch (error) {
      devLog('[auth] Error en registro:', error);
      msg.className = 'inline-message error';
      msg.textContent = translateFirebaseError(error.code, error.message);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIO DE LOGIN
// ─────────────────────────────────────────────────────────────────────────────
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('loginMessage');
    msg.textContent = '';
    msg.className = 'inline-message';

    // ALTO-02: Verificar bloqueo por intentos fallidos
    if (Date.now() < loginAttempts.lockedUntil) {
      const mins = Math.ceil((loginAttempts.lockedUntil - Date.now()) / 60000);
      msg.className = 'inline-message error';
      msg.textContent = `Demasiados intentos fallidos. Esperá ${mins} minuto(s) antes de intentar nuevamente.`;
      return;
    }

    try {
      const emailVal = document.getElementById('loginEmail').value.trim().toLowerCase();
      const passVal  = document.getElementById('loginPassword').value;

      await signInWithEmailAndPassword(auth, emailVal, passVal);

      // Resetear contador en login exitoso
      loginAttempts.count      = 0;
      loginAttempts.lockedUntil = 0;

      window.location.href = 'index.html';
    } catch (error) {
      devLog('[auth] Error en login:', error);

      // ALTO-02: Incrementar contador de intentos fallidos
      loginAttempts.count++;
      if (loginAttempts.count >= MAX_ATTEMPTS) {
        loginAttempts.lockedUntil = Date.now() + LOCKOUT_MS;
        msg.className = 'inline-message error';
        msg.textContent =
          'Demasiados intentos. Tu acceso está bloqueado por 15 minutos por razones de seguridad.';
      } else {
        const restantes = MAX_ATTEMPTS - loginAttempts.count;
        msg.className = 'inline-message error';
        msg.textContent =
          `${translateFirebaseError(error.code, error.message)} (Intentos restantes: ${restantes})`;
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIO DE RECUPERACIÓN DE CONTRASEÑA
// ─────────────────────────────────────────────────────────────────────────────
const resetForm = document.getElementById('resetForm');
if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('resetMessage');
    msg.textContent = '';
    try {
      await sendPasswordResetEmail(
        auth,
        document.getElementById('resetEmail').value.trim().toLowerCase(),
      );
      msg.className = 'inline-message success';
      msg.textContent = 'Si esa dirección está registrada, recibirás un correo de recuperación.';
    } catch (error) {
      devLog('[auth] Error en reset:', error);
      msg.className = 'inline-message error';
      // No revelar si el email existe o no (previene enumeración de usuarios)
      msg.textContent =
        'Si esa dirección está registrada, recibirás un correo de recuperación.';
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Traducción de errores de Firebase (sin exponer códigos internos en prod)
// ─────────────────────────────────────────────────────────────────────────────
function translateFirebaseError(code, fallback) {
  const map = {
    'auth/email-already-in-use':     'Ese correo ya está registrado.',
    'auth/invalid-email':            'El correo no es válido.',
    'auth/weak-password':            `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
    'auth/invalid-credential':       'Correo o contraseña incorrectos.',
    'auth/too-many-requests':        'Demasiados intentos. Intentá más tarde.',
    'auth/user-disabled':            'Esta cuenta está desactivada.',
    'auth/network-request-failed':   'Error de red. Verificá tu conexión.',
    'permission-denied':             'Sin permisos. Contactá al administrador.',
  };
  // En producción no exponer el código desconocido
  if (IS_DEV) return map[code] || `[${code || 'error'}] ${fallback || 'Ocurrió un error.'}`;
  return map[code] || 'Ocurrió un error. Intentá de nuevo.';
}
