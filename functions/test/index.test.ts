import * as admin from "firebase-admin";

type AuthResponse = {
  idToken: string;
};

type FunctionResponse<T> =
  | {
      result: T;
    }
  | {
      error: {
        status: string;
        message: string;
      };
    };

type ListAtendimentosResponse = {
  atendimentos: Array<{
    id: string;
    tenantId: string;
    transcricao: string;
    duracaoSegundos: number;
    status: string;
    criadoEm: string;
  }>;
};

type CreateAtendimentoResponse = {
  id: string;
};

type ResumoPorTenantResponse = {
  novo: number;
  pendente: number;
  resolvido: number;
};

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: "atendeai-teste-local" });
}

const db = admin.firestore();

const PROJECT_ID = "atendeai-teste-local";
const FUNCTIONS_URL = `http://127.0.0.1:5001/${PROJECT_ID}/us-central1`;

const usuarios = {
  alfa: {
    email: "usuario.a@atendeai.local",
    password: "123456",
    tenantId: "tenant-alfa",
  },
  beta: {
    email: "usuario.b@atendeai.local",
    password: "123456",
    tenantId: "tenant-beta",
  },
};

async function criarOuAtualizarUsuario(usuario: {
  email: string;
  password: string;
  tenantId: string;
}) {
  let user;

  try {
    user = await admin.auth().getUserByEmail(usuario.email);
  } catch (error: any) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    user = await admin.auth().createUser({
      email: usuario.email,
      password: usuario.password,
      emailVerified: true,
    });
  }

  await admin.auth().setCustomUserClaims(user.uid, {
    tenantId: usuario.tenantId,
  });

  return user;
}

async function autenticar(
  email: string,
  password: string
): Promise<string> {
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const body = (await response.json()) as AuthResponse;

  if (!response.ok) {
    throw new Error(JSON.stringify(body));
  }

  return body.idToken;
}

async function chamarFunction<T>(
  nome: string,
  data: unknown,
  idToken?: string
): Promise<{
  status: number;
  body: FunctionResponse<T>;
}> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  const response = await fetch(`${FUNCTIONS_URL}/${nome}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
  });

  return {
    status: response.status,
    body: (await response.json()) as FunctionResponse<T>,
  };
}

async function limparAtendimentos() {
  const snapshot = await db.collection("atendimentos").get();

  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

beforeAll(async () => {
  await criarOuAtualizarUsuario(usuarios.alfa);
  await criarOuAtualizarUsuario(usuarios.beta);
});

beforeEach(async () => {
  await limparAtendimentos();

  await db.collection("atendimentos").add({
    tenantId: "tenant-alfa",
    transcricao: "Atendimento Alfa resolvido",
    duracaoSegundos: 100,
    status: "resolvido",
    criadoEm: new Date().toISOString(),
  });

  await db.collection("atendimentos").add({
    tenantId: "tenant-alfa",
    transcricao: "Atendimento Alfa novo",
    duracaoSegundos: 120,
    status: "novo",
    criadoEm: new Date().toISOString(),
  });

  await db.collection("atendimentos").add({
    tenantId: "tenant-beta",
    transcricao: "Atendimento Beta pendente",
    duracaoSegundos: 200,
    status: "pendente",
    criadoEm: new Date().toISOString(),
  });
});

afterAll(async () => {
  await admin.app().delete();
});

describe("modelo de dados básico", () => {
  it("permite gravar e ler um atendimento de um tenant", async () => {
    const ref = await db.collection("atendimentos").add({
      tenantId: "tenant-teste",
      transcricao: "teste automatizado",
      status: "novo",
    });

    const snapshot = await ref.get();

    expect(snapshot.exists).toBe(true);
    expect(snapshot.data()?.tenantId).toBe("tenant-teste");
  });
});

describe("isolamento por tenant", () => {
  it("recusa usuário não autenticado", async () => {
    const response = await chamarFunction<ListAtendimentosResponse>(
      "listAtendimentos",
      {
        tenantId: "tenant-alfa",
      }
    );

    expect(response.status).toBe(401);

    if (!("error" in response.body)) {
      throw new Error("Resposta deveria conter um erro.");
    }

    expect(response.body.error.status).toBe("UNAUTHENTICATED");
  });

  it("impede usuário do tenant alfa de acessar dados do tenant beta", async () => {
    const token = await autenticar(
      usuarios.alfa.email,
      usuarios.alfa.password
    );

    const response = await chamarFunction<ListAtendimentosResponse>(
      "listAtendimentos",
      {
        tenantId: "tenant-beta",
      },
      token
    );

    expect(response.status).toBe(200);

    if (!("result" in response.body)) {
      throw new Error("Resposta deveria conter result.");
    }

    expect(response.body.result.atendimentos).toHaveLength(2);

    expect(
      response.body.result.atendimentos.every(
        (atendimento) => atendimento.tenantId === "tenant-alfa"
      )
    ).toBe(true);
  });

  it("cria atendimento usando o tenant autenticado", async () => {
    const token = await autenticar(
      usuarios.alfa.email,
      usuarios.alfa.password
    );

    const response = await chamarFunction<CreateAtendimentoResponse>(
      "createAtendimento",
      {
        tenantId: "tenant-beta",
        transcricao: "Tentativa de alteração de tenant",
        duracaoSegundos: 50,
      },
      token
    );

    expect(response.status).toBe(200);

    if (!("result" in response.body)) {
      throw new Error("Resposta deveria conter result.");
    }

    const snapshot = await db
      .collection("atendimentos")
      .doc(response.body.result.id)
      .get();

    expect(snapshot.exists).toBe(true);
    expect(snapshot.data()?.tenantId).toBe("tenant-alfa");
  });
});

describe("resumoPorTenant", () => {
  it("retorna as contagens corretas para o tenant autenticado", async () => {
    const token = await autenticar(
      usuarios.alfa.email,
      usuarios.alfa.password
    );

    const response = await chamarFunction<ResumoPorTenantResponse>(
      "resumoPorTenant",
      {},
      token
    );

    expect(response.status).toBe(200);

    if (!("result" in response.body)) {
      throw new Error("Resposta deveria conter result.");
    }

    expect(response.body.result).toEqual({
      novo: 1,
      pendente: 0,
      resolvido: 1,
    });
  });
});