// PrimeVicio - Site - Copia/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do Firebase para DADOS (filmes, séries) - a antiga
const dataFirebaseConfig = {
  apiKey: "AIzaSyCNEGDpDLuWYrxTkoONy4oQujnatx6KIS8",
  authDomain: "cineveok.firebaseapp.com",
  databaseURL: "https://cineveok-default-rtdb.firebaseio.com",
  projectId: "cineveok",
  storageBucket: "cineveok.firebasestorage.app",
  messagingSenderId: "805536124347",
  appId: "1:805536124347:web:b408c28cb0a4dc914d089e",
  measurementId: "G-H7WVDQQDVJ"
};

// Configuração do Firebase para AUTENTICAÇÃO (login e histórico) - a nova
const authFirebaseConfig = {
  apiKey: "AIzaSyCCgmkGk2zqwpSRnLNZXODrPGM1ijcYZ9g",
  authDomain: "primevicio2.firebaseapp.com",
  projectId: "primevicio2",
  storageBucket: "primevicio2.firebasestorage.app",
  messagingSenderId: "579103482191",
  appId: "1:579103482191:web:c1b781b847f19e11f4a53a"
};

// Função para inicializar um app Firebase com um nome específico e evitar recriação
const initializeFirebaseApp = (config: any, name: string): FirebaseApp => {
  const apps = getApps();
  const existingApp = apps.find(app => app.name === name);
  return existingApp ? existingApp : initializeApp(config, name);
};

// Inicializa os dois apps com nomes distintos
const dataApp = initializeFirebaseApp(dataFirebaseConfig, "dataApp");
const authApp = initializeFirebaseApp(authFirebaseConfig, "authApp");

// Exporta as instâncias necessárias e com nomes claros
const dataFirestore = getFirestore(dataApp);   // Firestore para buscar dados de filmes/séries
const userFirestore = getFirestore(authApp);   // Firestore para salvar dados de usuários (histórico)
const auth = getAuth(authApp);                 // Auth para login/cadastro

export { dataFirestore, userFirestore, auth };