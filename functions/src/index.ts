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