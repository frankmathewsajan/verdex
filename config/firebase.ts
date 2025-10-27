// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDsOLHK5bfEeUSBrHbvh9XdrWovftaV5io",
  authDomain: "verdex-soil.firebaseapp.com",
  projectId: "verdex-soil",
  storageBucket: "verdex-soil.firebasestorage.app",
  messagingSenderId: "329132289201",
  appId: "1:329132289201:web:54ac41a2345f087edb8690",
  measurementId: "G-FHCR9WH0B9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

export { auth };


