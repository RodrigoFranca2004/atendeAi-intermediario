import { HttpsError, CallableRequest } from "firebase-functions/v2/https";

export function getAuthenticatedTenantId(
  request: CallableRequest<unknown>
): string {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "É necessário estar autenticado."
    );
  }

  const tenantId = request.auth.token.tenantId;

  if (typeof tenantId !== "string" || !tenantId) {
    throw new HttpsError(
      "failed-precondition",
      "Usuário não possui tenantId."
    );
  }

  return tenantId;
}