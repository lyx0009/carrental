// firebase-config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAgorYlaV8_fk3uCmiWQVtM1402cSIFaBeU",
    authDomain: "carrental-4bdd4.firebaseapp.com",
    projectId: "carrental-4bdd4",
    storageBucket: "carrental-4bdd4.firebasestorage.app",
    messagingSenderId: "318648301485",
    appId: "1:318648301485:web:bc543198901a732b701324",
    measurementId: "G-102E4MXEDK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage, app };