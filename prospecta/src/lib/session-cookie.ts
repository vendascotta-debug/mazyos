/**
 * Nome do cookie de sessão, isolado num módulo sem dependências de Node.
 *
 * O middleware da Vercel roda no runtime Edge, que não tem `node:crypto` —
 * importar `lib/auth` lá quebraria o build. Só a constante mora aqui.
 */
export const SESSION_COOKIE = "prospecta_sessao";
