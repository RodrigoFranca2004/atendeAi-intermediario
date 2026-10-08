import { useEffect, useState } from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import { auth, functions } from "./firebase";

type Atendimento = {
  id: string;
  transcricao: string;
  status: string;
  duracaoSegundos: number;
};

const USUARIO_TESTE = {
  email: "usuario.a@atendeai.local",
  password: "123456",
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  async function entrar() {
    setAutenticando(true);
    setErro(null);

    try {
      await signInWithEmailAndPassword(
        auth,
        USUARIO_TESTE.email,
        USUARIO_TESTE.password
      );
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Erro ao realizar autenticação."
      );
    } finally {
      setAutenticando(false);
    }
  }

  async function sair() {
    await signOut(auth);
    setAtendimentos([]);
  }

  async function carregar() {
    setCarregando(true);
    setErro(null);

    try {
      const listAtendimentos = httpsCallable(
        functions,
        "listAtendimentos"
      );

      const resp = await listAtendimentos({});

      setAtendimentos(
        (resp.data as { atendimentos: Atendimento[] }).atendimentos
      );
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Erro desconhecido"
      );
    } finally {
      setCarregando(false);
    }
  }

  if (!user) {
    return (
      <div
        style={{
          fontFamily: "sans-serif",
          maxWidth: 720,
          margin: "40px auto",
        }}
      >
        <h1>AtendeAI — projeto de teste</h1>

        <p>
          Autentique-se para acessar os atendimentos.
        </p>

        <button onClick={entrar} disabled={autenticando}>
          {autenticando
            ? "autenticando..."
            : "entrar como usuário de teste"}
        </button>

        {erro && (
          <p style={{ color: "red" }}>
            {erro}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        maxWidth: 720,
        margin: "40px auto",
      }}
    >
      <h1>AtendeAI — projeto de teste</h1>

      <p>
        Usuário autenticado: <code>{user.email}</code>
      </p>

      <button onClick={carregar} disabled={carregando}>
        {carregando
          ? "carregando..."
          : "carregar atendimentos"}
      </button>

      {" "}
      
      <button onClick={sair}>
        sair
      </button>

      {erro && (
        <p style={{ color: "red" }}>
          {erro}
        </p>
      )}

      <ul>
        {atendimentos.map((a) => (
          <li key={a.id}>
            <strong>{a.status}</strong> (
            {a.duracaoSegundos}s) — {a.transcricao}
          </li>
        ))}
      </ul>
    </div>
  );
}