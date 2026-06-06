import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { doc, getDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const registerForm = document.getElementById('registerForm');

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const msg = document.getElementById('registerMessage');
    msg.textContent = '';
    msg.className = 'inline-message';

    const username = document.getElementById('username').value.trim().toLowerCase();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const participantType = document.getElementById('participantType').value;
    const specialty = document.getElementById('specialty').value.trim();
    const year = document.getElementById('year').value;

    if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
      msg.textContent = 'El usuario debe tener entre 3 y 30 caracteres. Solo letras, números, punto y guion bajo.';
      msg.className = 'inline-message error';
      return;
    }

    if (password.length < 6) {
      msg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      msg.className = 'inline-message error';
      return;
    }

    try {
      const usernameRef = doc(db, 'usernames', username);
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
        updatedAt: serverTimestamp()
      });

      batch.set(usernameRef, {
        uid: user.uid,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      window.location.href = 'index.html';
    } catch (error) {
      console.error(error);
      msg.className = 'inline-message error';
      msg.textContent = translateFirebaseError(error.code, error.message);
    }
  });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('loginMessage');
    msg.textContent = '';
    msg.className = 'inline-message';

    try {
      await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value.trim().toLowerCase(), document.getElementById('loginPassword').value);
      window.location.href = 'index.html';
    } catch (error) {
      console.error(error);
      msg.className = 'inline-message error';
      msg.textContent = translateFirebaseError(error.code, error.message);
    }
  });
}

const resetForm = document.getElementById('resetForm');
if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('resetMessage');
    msg.textContent = '';
    try {
      await sendPasswordResetEmail(auth, document.getElementById('resetEmail').value.trim().toLowerCase());
      msg.className = 'inline-message success';
      msg.textContent = 'Correo de recuperación enviado. Revisá tu bandeja de entrada.';
    } catch (error) {
      console.error(error);
      msg.className = 'inline-message error';
      msg.textContent = translateFirebaseError(error.code, error.message);
    }
  });
}

function translateFirebaseError(code, fallback) {
  const map = {
    'auth/email-already-in-use': 'Ese correo ya está registrado.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'permission-denied': 'Permisos insuficientes. Revisá las reglas de Firestore.'
  };
  return map[code] || `${code || 'error'}: ${fallback || 'Ocurrió un error.'}`;
}
