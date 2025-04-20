// firebaseConfig.js
// Firebase configuration file

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBGv3kHCZFXd_JXv7axs26SY7paOqHVgfY",
    authDomain: "healthcompanion-app.firebaseapp.com",
    projectId: "healthcompanion-app",
    storageBucket: "healthcompanion-app.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abc123def456ghi789jkl"
  };
  
  // Initialize Firebase
  import { initializeApp } from "https://cdnjs.cloudflare.com/ajax/libs/firebase/10.7.1/firebase-app.js";
  import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
  } from "https://cdnjs.cloudflare.com/ajax/libs/firebase/10.7.1/firebase-auth.js";
  import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    collection,
    addDoc,
    updateDoc,
    serverTimestamp 
  } from "https://cdnjs.cloudflare.com/ajax/libs/firebase/10.7.1/firebase-firestore.js";
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  export { 
    app, 
    auth, 
    db, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    updateDoc,
    serverTimestamp
  };