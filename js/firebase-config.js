// ⚠ SEGURIDAD: Reemplazá estos valores con los de tu nuevo proyecto Firebase.
// Restringí la API Key en Firebase Console → Configuración → Credenciales → API Keys
// → Restricciones de aplicación: solo tu dominio de producción.
// Ver: https://firebase.google.com/docs/projects/api-keys
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  browserSessionPersistence,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "REEMPLAZAR_CON_NUEVA_API_KEY",
  authDomain: "REEMPLAZAR_CON_AUTHDOMAIN.firebaseapp.com",
  projectId: "REEMPLAZAR_CON_PROJECTID",
  storageBucket: "REEMPLAZAR_CON_STORAGEBUCKET",
  messagingSenderId: "REEMPLAZAR_CON_SENDERID",
  appId: "REEMPLAZAR_CON_APPID",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// NIST AC-12 / ISO 27001 A.8.5: Persistencia de sesión (se cierra al cerrar la pestaña).
// Ideal para equipos compartidos en contexto educativo.
setPersistence(auth, browserSessionPersistence).catch((err) => {
  // No usar console.error en producción; solo loguear en desarrollo
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    console.warn("[Seguridad] No se pudo configurar persistencia de sesión:", err.code);
  }
});
