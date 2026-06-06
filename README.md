# Penca Mundial 2026

Aplicación web institucional del Profesorado de Informática para pronosticar partidos del Mundial 2026.  
Desarrollada por **Ezequiel Costa**, 3.er año de Profesorado de Informática.

**Stack:** HTML + Vanilla JS (ES Modules) + Firebase (Auth v10 + Firestore) — SPA estática.

---

## Índice

1. [Estructura del proyecto](#estructura-del-proyecto)
2. [Configuración inicial (Setup)](#configuración-inicial-setup)
3. [🔐 Seguridad — Checklist de deploy](#-seguridad--checklist-de-deploy)
4. [Firestore Security Rules](#firestore-security-rules)
5. [Rotación de credenciales](#rotación-de-credenciales)
6. [Headers HTTP de seguridad](#headers-http-de-seguridad)

---

## Estructura del proyecto

```
penca1SecHardening/
├── index.html          # App principal (requiere autenticación)
├── inicio.html         # Landing page pública
├── login.html          # Inicio de sesión
├── registro.html       # Registro de nuevos usuarios
├── reset.html          # Recuperación de contraseña
├── setup.html          # ⚠️ Solo desarrollo — EXCLUIR en producción
├── firebase.json       # Configuración de Firebase Hosting (headers de seguridad)
├── firestore.rules     # Reglas de seguridad de Firestore
├── .gitignore          # Excluye archivos sensibles del repositorio
├── css/
│   └── style.css
└── js/
    ├── app.js          # Lógica principal de la aplicación
    ├── auth.js         # Autenticación (login, registro, reset)
    ├── firebase-config.js  # Inicialización de Firebase
    ├── setup.js        # ⚠️ Solo desarrollo — EXCLUIR en producción
    └── seed-data.js    # ⚠️ Solo desarrollo — EXCLUIR en producción
```

---

## Configuración inicial (Setup)

### 1. Crear proyecto en Firebase Console

1. Ir a [Firebase Console](https://console.firebase.google.com/) → Crear proyecto.
2. Habilitar **Authentication** → Email/Password.
3. Habilitar **Firestore Database** → Modo de producción.

### 2. Configurar credenciales

Reemplazar los valores placeholder en [`js/firebase-config.js`](js/firebase-config.js):

```js
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};
```

> **IMPORTANTE:** Después de reemplazar, restringir la API Key en:  
> Firebase Console → Configuración del proyecto → Credenciales → Restricciones de aplicación → HTTP referrers → Solo tu dominio de producción.

### 3. Primera carga de datos (solo una vez)

1. Publicar las reglas iniciales permisivas (ver `firestore-rules-inicial-setup.txt`).
2. Abrir `setup.html` **en entorno local** con la cuenta que será administradora.
3. Hacer clic en "Cargar base y hacerme admin".
4. **Inmediatamente después**, publicar las reglas finales de `firestore.rules`.

---

## 🔐 Seguridad — Checklist de deploy

### ⛔ ANTES de cualquier deploy a producción

- [ ] **Rotar la API Key** de Firebase Console si alguna vez se expuso en git.  
  Firebase Console → Configuración → Credenciales → Rotar clave.
- [ ] **Restringir la API Key** a tu dominio de producción (HTTP referrers).
- [ ] **Verificar** que `setup.html`, `js/setup.js` y `js/seed-data.js` **no estén en el deploy**.  
  Estos archivos están en `.gitignore` y en la lista `ignore` de `firebase.json`.
- [ ] **Publicar `firestore.rules`** con `firebase deploy --only firestore:rules`.
- [ ] **Publicar `firebase.json`** con `firebase deploy --only hosting`.

### 📋 Archivos a EXCLUIR de producción

| Archivo | Motivo |
|---|---|
| `setup.html` | Permite auto-asignación de rol admin |
| `js/setup.js` | Reescribe toda la base de datos |
| `js/seed-data.js` | Expone estructura interna del torneo |

### 🔍 Verificar historial de git

Si alguna vez se commitearon credenciales reales, usar [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) o `git filter-repo` para limpiar el historial:

```bash
# Verificar si hay credenciales en el historial
git log --all --oneline -p -- js/firebase-config.js | grep -i "apiKey"

# Si aparecen claves reales: rotar la clave EN FIREBASE CONSOLE primero,
# luego limpiar el historial con BFG o git filter-repo.
```

---

## Firestore Security Rules

Las reglas de seguridad están en [`firestore.rules`](firestore.rules).

**Principios aplicados:**
- **Denegación por defecto**: todo lo no especificado explícitamente está denegado.
- **Verificación server-side**: el rol admin se verifica en Firestore, no en el cliente.
- **Mínimo privilegio**: cada colección tiene permisos específicos y acotados.
- **Anti-escalada**: nadie puede auto-asignarse el rol `admin` desde el cliente.

Para publicar:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

---

## Rotación de credenciales

Si se comprometen las credenciales de Firebase:

1. **Firebase Console** → Configuración del proyecto → Credenciales → Rotar API Key.
2. Actualizar `js/firebase-config.js` con la nueva clave.
3. Si el repo es o fue público: limpiar historial de git (ver sección anterior).
4. Revisar los logs de Firestore en Firebase Console para actividad sospechosa.
5. Si se sospecha acceso no autorizado: deshabilitar usuarios en Firebase Auth Console.

---

## Headers HTTP de seguridad

Los headers de seguridad están configurados en [`firebase.json`](firebase.json):

| Header | Valor | Protege contra |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Downgrade attacks, MITM |
| `X-Content-Type-Options` | `nosniff` | MIME type sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Info leakage via Referer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Feature abuse |
| `Content-Security-Policy` | (ver firebase.json) | XSS, script injection |

---

## Frameworks de seguridad aplicados

- **OWASP Top 10 2021**
- **NIST SP 800-53 Rev. 5**
- **CIS Controls v8**
- **ISO/IEC 27001:2022**

---

*Última actualización: junio 2026.*