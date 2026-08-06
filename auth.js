// ============================================================
// auth.js — Camada de autenticação Living Landbank
// Firebase project: living-landbank
// EmailJS: service_zy35wya | admin: negociosliving@outlook.com
// ============================================================

// ---------- CONFIG FIREBASE ----------
const firebaseConfig = {
  apiKey: "AIzaSyAOQ4jWpC4kE8efXU5D1KdvXg_De0U8WQ4",
  authDomain: "living-landbank.firebaseapp.com",
  projectId: "living-landbank",
  storageBucket: "living-landbank.firebasestorage.app",
  messagingSenderId: "572852178816",
  appId: "1:572852178816:web:04a3a90b2435b94450fb65"
};

// ---------- EMAILJS CONFIG ----------
const EMAILJS_SERVICE_ID  = "service_zy35wya";
const EMAILJS_TPL_APPROVE = "template_z253g93";
const EMAILJS_TPL_ADMIN   = "template_x4y9jkh";
const EMAILJS_PUBLIC_KEY  = "P312jYZkHH4y6Jsad";
const ADMIN_EMAIL         = "negociosliving@outlook.com";
const APP_URL             = "https://negociosliving.github.io/living-landbank/";

// ---------- INICIALIZAÇÃO ----------
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db   = firebase.firestore();

emailjs.init(EMAILJS_PUBLIC_KEY);

// ============================================================
// PROTEÇÃO DO PAINEL
// ============================================================
function checkAuth() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const snap = await db.collection("usuarios").doc(user.uid).get();
    if (!snap.exists || snap.data().status !== "aprovado") {
      await auth.signOut();
      window.location.href = "login.html?msg=aguardando";
      return;
    }

    const el = document.getElementById("user-name");
    if (el) el.textContent = snap.data().nome || user.email;
  });
}

// ============================================================
// CADASTRO
// ============================================================
async function cadastrar(nome, email, senha) {
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, senha);
    const uid  = cred.user.uid;

    await db.collection("usuarios").doc(uid).set({
      nome,
      email,
      status: "pendente",
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TPL_ADMIN, {
      admin_email: ADMIN_EMAIL,
      user_nome:   nome,
      user_email:  email,
      painel_url:  APP_URL
    });

    return { ok: true, msg: "Cadastro realizado! Aguarde a aprovação do administrador." };
  } catch (e) {
    return { ok: false, msg: traduzirErroFirebase(e.code) };
  }
}

// ============================================================
// LOGIN
// ============================================================
async function login(email, senha) {
  try {
    const cred = await auth.signInWithEmailAndPassword(email, senha);
    const uid  = cred.user.uid;

    const snap = await db.collection("usuarios").doc(uid).get();
    if (!snap.exists || snap.data().status !== "aprovado") {
      await auth.signOut();
      return { ok: false, msg: "Seu acesso ainda não foi aprovado. Aguarde o e-mail de confirmação." };
    }

    window.location.href = "index.html";
    return { ok: true };
  } catch (e) {
    return { ok: false, msg: traduzirErroFirebase(e.code) };
  }
}

// ============================================================
// RECUPERAÇÃO DE SENHA
// ============================================================
async function recuperarSenha(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    return { ok: true, msg: "E-mail de recuperação enviado! Verifique sua caixa de entrada." };
  } catch (e) {
    return { ok: false, msg: traduzirErroFirebase(e.code) };
  }
}

// ============================================================
// LOGOUT
// ============================================================
async function logout() {
  await auth.signOut();
  window.location.href = "login.html";
}

// ============================================================
// APROVAÇÃO DE USUÁRIO
// ============================================================
async function aprovarUsuario(uid) {
  const snap = await db.collection("usuarios").doc(uid).get();
  if (!snap.exists) return;

  const { nome, email } = snap.data();

  await db.collection("usuarios").doc(uid).update({ status: "aprovado" });

  await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TPL_APPROVE, {
    user_nome:  nome,
    user_email: email,
    painel_url: APP_URL
  });
}

// ============================================================
// TRADUÇÃO DE ERROS DO FIREBASE
// ============================================================
function traduzirErroFirebase(code) {
  const erros = {
    "auth/user-not-found":        "E-mail não encontrado.",
    "auth/wrong-password":        "Senha incorreta.",
    "auth/email-already-in-use":  "Este e-mail já está cadastrado.",
    "auth/weak-password":         "A senha deve ter pelo menos 6 caracteres.",
    "auth/invalid-email":         "E-mail inválido.",
    "auth/too-many-requests":     "Muitas tentativas. Tente novamente mais tarde.",
    "auth/network-request-failed":"Erro de conexão. Verifique sua internet."
  };
  return erros[code] || "Erro inesperado. Tente novamente.";
}
