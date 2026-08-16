# Production Deployment

Target origin: `https://portal.ecelliiitsurat.in`. DNS changes are an operator task and are not performed by this repository.

## PostgreSQL

Create a PostgreSQL database with TLS, backups, and a least-privilege application account. Use a pooled connection endpoint compatible with the hosting runtime. Set `DATABASE_URL`, then apply committed migrations:

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:deploy
```

Never use `prisma db push` for production and never run `db:seed` there.

## Google OAuth

Create a Google OAuth 2.0 Web Application and configure its consent screen. Add `https://portal.ecelliiitsurat.in` as the JavaScript origin and `https://portal.ecelliiitsurat.in/api/auth/callback/google` as the exact redirect URI. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, and the canonical `APP_URL`.

Set `SUPER_ADMIN_EMAILS` to the exact Google email allowed to bootstrap administration. Sign in once, confirm its stored database role, and then reduce or remove the bootstrap allowlist according to policy.

## Private Cloudflare R2

Create a private bucket with public `r2.dev` access disabled and a token restricted to read/write objects in that bucket. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_PRIVATE_BUCKET`.

Bucket CORS must allow the portal origin to issue `PUT` requests with `content-type`, `x-amz-meta-application`, and `x-amz-meta-field`. Do not permit public reads.

## Email

Verify the sending domain in Resend and set `EMAIL_PROVIDER=resend`, `EMAIL_FROM`, `RESEND_API_KEY`, and a random `CRON_SECRET` of at least 32 characters. Schedule `POST /api/internal/email/process` with `Authorization: Bearer <CRON_SECRET>`.

## Runtime variable names

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_TRUST_HOST`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPER_ADMIN_EMAILS`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PRIVATE_BUCKET`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY`
- `CRON_SECRET`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `APP_URL`
- `NODE_ENV`

## Release verification

```powershell
npm.cmd run db:generate
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --omit=dev
```

After deployment, verify `/api/health`, Google sign-in, participant submission, reviewer evaluation, result publication, private upload/download, and email-queue processing. Enable PostgreSQL backups, R2 retention/versioning policy, monitoring, credential rotation, and audit review. Never log tokens, signed URLs, dynamic answers, or document bytes.
