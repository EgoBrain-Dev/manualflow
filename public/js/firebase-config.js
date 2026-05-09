// Firebase configuration - seguro com variável de ambiente
console.log('🔥 Firebase config carregado');

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail,
    updateProfile,
    sendEmailVerification,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore,
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Configuração do Firebase para o seu projeto usando variável de ambiente
const firebaseConfig = {
    apiKey: window.FIREBASE_API_KEY,
    authDomain: "manualflow-b39af.firebaseapp.com",
    projectId: "manualflow-b39af",
    storageBucket: "manualflow-b39af.firebasestorage.app",
    messagingSenderId: "616212017101",
    appId: "1:616212017101:web:aa4fdc159667469a261e84",
    measurementId: "G-L025XHDGKN"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log('✅ Firebase inicializado com sucesso');

// Export para módulos ES6
export {
    auth,
    db,
    storage,
    // Auth functions
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail,
    updateProfile,
    sendEmailVerification,
    GoogleAuthProvider,
    signInWithPopup,
    // Firestore functions
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    // Storage functions
    ref,
    uploadBytesResumable,
    getDownloadURL
};
