import { onCall } from "firebase-functions/v2/https";

import { db } from "./admin";
import { getAuthenticatedTenantId } from "./auth";

/**
 * Function de exemplo — só para você confirmar que o ambiente está rodando.
 */
export const ping = onCall(() => {
  return { ok: true, message: "pong" };
});

/**
 * Lista os atendimentos do tenant do usuário autenticado.
 */
export const listAtendimentos = onCall(async (request) => {
  const tenantId = getAuthenticatedTenantId(request);

  const snapshot = await db
    .collection("atendimentos")
    .where("tenantId", "==", tenantId)
    .get();

  return {
    atendimentos: snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })),
  };
});

/**
 * Cria um novo registro de atendimento para o tenant do usuário autenticado.
 */
export const createAtendimento = onCall(async (request) => {
  const { transcricao, duracaoSegundos } = request.data ?? {};
  const tenantId = getAuthenticatedTenantId(request);

  const doc = await db.collection("atendimentos").add({
    tenantId,
    transcricao: transcricao ?? "",
    duracaoSegundos: duracaoSegundos ?? 0,
    status: "novo",
    criadoEm: new Date().toISOString(),
  });

  return { id: doc.id };
});

/**
 * Retorna a contagem de atendimentos por status do tenant do usuário autenticado.
 *
 * O tenantId é obtido exclusivamente do token de autenticação.
 */
export const resumoPorTenant = onCall(async (request) => {
  const tenantId = getAuthenticatedTenantId(request);

  const snapshot = await db
    .collection("atendimentos")
    .where("tenantId", "==", tenantId)
    .get();

  const resumo = {
    novo: 0,
    pendente: 0,
    resolvido: 0,
  };

  snapshot.docs.forEach((doc) => {
    const status = doc.data().status;

    if (status === "novo") {
      resumo.novo++;
    }

    if (status === "pendente") {
      resumo.pendente++;
    }

    if (status === "resolvido") {
      resumo.resolvido++;
    }
  });

  return resumo;
});