/**
 * Nome do cookie de sessão, isolado num módulo sem dependências de Node.
 *
 * O middleware roda no runtime Edge, que não tem `node:crypto` completo —
 * importar `lib/auth` lá quebraria o build. Só a constante mora aqui.
 */
export const SESSION_COOKIE = "linkfive_sessao";
