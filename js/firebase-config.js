// Pegá acá la configuración real que te da Firebase Console → Project settings → Your apps → Web app.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOJ7wHVeCE7iwVh49anOjakzAJ4x-H9xY",
  authDomain: "mundial-72a87.firebaseapp.com",
  projectId: "mundial-72a87",
  storageBucket: "mundial-72a87.firebasestorage.app",
  messagingSenderId: "735832559935",
  appId: "1:735832559935:web:ab8fb046c4838e31d0838a",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
