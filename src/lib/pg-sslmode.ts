/**
 * Current `pg` treats sslmode=require/prefer/verify-ca as verify-full.
 * Future pg v9 / pg-connection-string v3 will weaken those to libpq
 * semantics (encrypt without hostname verification). Rewrite to the
 * explicit mode that matches today's behavior. Does not log the URL.
 */
export function withExplicitVerifyFullSsl(connectionString: string): string {
  return connectionString.replace(
    /([?&])sslmode=(require|prefer|verify-ca)(?=&|$)/gi,
    "$1sslmode=verify-full",
  );
}
