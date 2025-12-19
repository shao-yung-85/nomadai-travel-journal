import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBCnLlCaVWh9iKhclzPWJcEPDuyH0OHPUM",
    authDomain: "ques-trip.firebaseapp.com",
    projectId: "ques-trip",
    storageBucket: "ques-trip.firebasestorage.app",
    messagingSenderId: "765263595886",
    appId: "1:765263595886:web:3e501d362abe47bfb8597f",
    measurementId: "G-R1NF9EVRHY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase App Initialized:", app.name);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app);

// Enable Offline Persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a a time.
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.warn('Firestore persistence not supported by browser');
    }
});

export default app;
