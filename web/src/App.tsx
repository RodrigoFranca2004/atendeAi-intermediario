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

type ResumoPorTenant = {
  novo: number;
  pendente: number;
  resolvido: number;
};

const USUARIO_TESTE = {
  email: "usuario.a@atendeai.local",
  password: "123456",
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [carregandoAtendimentos, setcarregandoAtendimentos] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoPorTenant | null>(null);
  const [carregandoResumo, setCarregandoResumo] = useState(false);

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
    setResumo(null);
  }

  async function carregarAtendimento() {
    setcarregandoAtendimentos(true);
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
      setcarregandoAtendimentos(false);
    }
  }

  async function carregarResumo() {
    setCarregandoResumo(true);
    setErro(null);

    try {
      const resumoPorTenant = httpsCallable<unknown, ResumoPorTenant>(
        functions,
        "resumoPorTenant"
      );

      const resp = await resumoPorTenant({});
      setResumo(resp.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar resumo.");
    } finally {
      setCarregandoResumo(false);
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

      <button onClick={carregarAtendimento} disabled={carregandoAtendimentos}>
        {carregandoAtendimentos
          ? "carregando..."
          : "carregar atendimentos"}
      </button>

      {" "}

      <button onClick={carregarResumo} disabled={carregandoResumo}>
        {carregandoResumo ? "consultando..." : "consultar resumo"}
      </button>
      
      <button onClick={sair}>
        sair
      </button>

      {erro && (
        <p style={{ color: "red" }}>
          {erro}
        </p>
      )}

      {resumo && (
        <section>
          <h2>Resumo de atendimentos</h2>
          <ul>
            <li>Novo: {resumo.novo}</li>
            <li>Pendente: {resumo.pendente}</li>
            <li>Resolvido: {resumo.resolvido}</li>
          </ul>
        </section>
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