// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
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
    sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL,
    deleteObject 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    // ATUALIZE COM SUAS CONFIGURAÇÕES DO FIREBASE
    apiKey: "sua-api-key",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "seu-sender-id",
    appId: "sua-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export all Firebase functionality
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
    // Firestore functions
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    // Storage functions
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
};