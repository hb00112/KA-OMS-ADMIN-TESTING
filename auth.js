const firebaseConfig = {
  apiKey: "AIzaSyA8GPuMiF81Ee_Rg9I1SDvHNtzf8omrHMs",
  authDomain: "ka-payments.firebaseapp.com",
  databaseURL: "https://ka-payments-default-rtdb.firebaseio.com",
  projectId: "ka-payments",
  storageBucket: "ka-payments.appspot.com",
  messagingSenderId: "840319722186",
  appId: "1:840319722186:web:240150e362e4a3140e8a33",
  measurementId: "G-X0Y6FJX846"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();