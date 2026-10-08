import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({
  projectId: "atendeai-teste-local",
});

const auth = getAuth();

const usuarios = [
  {
    email: "usuario.a@atendeai.local",
    password: "123456",
    tenantId: "tenant-a",
  },
  {
    email: "usuario.b@atendeai.local",
    password: "123456",
    tenantId: "tenant-b",
  },
];

async function seedAuth() {
  for (const usuario of usuarios) {
    let user;

    try {
      user = await auth.getUserByEmail(usuario.email);
    } catch (error: any) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }

      user = await auth.createUser({
        email: usuario.email,
        password: usuario.password,
        emailVerified: true,
      });
    }

    await auth.setCustomUserClaims(user.uid, {
      tenantId: usuario.tenantId,
    });

    console.log(
      `Usuário ${usuario.email} configurado para ${usuario.tenantId}`
    );
  }
}

seedAuth()
  .then(() => {
    console.log("Seed de autenticação concluído.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao popular autenticação:", error);
    process.exit(1);
  });