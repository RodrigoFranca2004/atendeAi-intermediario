import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFunctions,
  connectFunctionsEmulator,
} from "firebase/functions";

const app = initializeApp({
  apiKey: "fake-api-key",
  authDomain: "atendeai-teste-local.firebaseapp.com",
  projectId: "atendeai-teste-local",
});

export const auth = getAuth(app);
export const functions = getFunctions(app);

connectAuthEmulator(auth, "http://localhost:9099", {
  disableWarnings: true,
});

connectFunctionsEmulator(functions, "localhost", 5001);