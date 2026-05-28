# Security Assessment

## pnpm audit findings (2026-05-28)

Total findings: 18 (3 low, 9 moderate, 6 high)

### High severity — production runtime assessment

| Package                    | Advisory                               | Path                                        | Production risk                                                                                                                                                                                                          |
| -------------------------- | -------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `multer <2.1.1`            | DoS via incomplete cleanup / recursion | `@nestjs/platform-express>multer`           | **LOW** — Our upload endpoint validates file size (configurable, default 50MB) and mime type before multer processes the file. Rate limiting (100 req/min per IP) further limits exploitation. Not a data breach vector. |
| `glob >=10.2.0 <10.5.0`    | CLI command injection via `-c/--cmd`   | `@nestjs-modules/mailer>mjml>mjml-cli>glob` | **NOT EXPLOITABLE** — The vulnerability requires attacker control over glob CLI arguments (`--cmd`). In our server, glob is used for file path matching internally; users never supply glob patterns or CLI arguments.   |
| `picomatch >=4.0.0 <4.0.4` | ReDoS via extglob quantifiers          | Various paths                               | **NOT EXPLOITABLE** — ReDoS requires attacker-controlled input to a glob pattern matcher. Our server does not accept user-supplied patterns for file matching.                                                           |
| `tmp <0.2.6`               | Path traversal via prefix/postfix      | `@nestjs/cli>inquirer>external-editor>tmp`  | **NOT PRESENT IN PRODUCTION** — `@nestjs/cli` is a devDependency only. It is not installed or deployed to production environments.                                                                                       |

### Mitigations in place

- Rate limiting: `@nestjs/throttler` — 100 req/min per IP, 300 req/min per authenticated user
- Upload validation: mime type allowlist + configurable size limit
- Helmet: HSTS, CSP, X-Frame-Options, X-Powered-By removed
- Input sanitization: `sanitize-html` on all user text fields
- CORS: origin allowlist restricted to configured domains

### Action taken

- Added `multer@2.1.1` as direct dependency in `apps/api` to encourage resolution to patched version
- Created `pnpm.yaml` with overrides for `multer`, `glob`, `picomatch`
- Note: pnpm transitive resolution may still use older versions in some paths

### Authentication security tests

See `apps/api/src/auth/auth.spec.ts` for test specs covering:

- Requests without token → 401
- Invalid/expired tokens → 401
- Blacklisted users → 401 (JWT blacklist via Redis)
- Tenant isolation (data scoped by tenant_id throughout all queries)
