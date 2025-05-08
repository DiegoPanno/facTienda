// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "fire_apiKey",
  authDomain: "tu-app.firebaseapp.com",
  projectId: "facturadorapp-a1897", 
  storageBucket: "tu-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { collection, getDocs, addDoc };


