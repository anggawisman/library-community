# SMTP setup (future)

Community Member Shelves currently uses a **console mailer** in development. When an admin approves a member, the temporary password is printed in the API process stdout (not sent over the network).

## Env vars for real SMTP later

Add these to `api/.env` when you implement `SmtpMailer`:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM="Community Shelves <noreply@example.com>"
# Optional
SMTP_SECURE=false
```

## Suggested implementation

1. Add a dependency such as `nodemailer`.
2. Implement `SmtpMailer` against the existing `Mailer` interface in [`api/src/mailer.ts`](../api/src/mailer.ts):

```ts
export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}
```

3. In `api/src/index.ts`, choose mailer based on env:

```ts
const mailer = process.env.SMTP_HOST ? new SmtpMailer(process.env) : new ConsoleMailer();
```

4. Keep `ConsoleMailer` as the default for local/dev so passwords remain visible in the terminal when SMTP is unset.

## Event reminders

Automated reminder jobs are **out of scope** for the current release. When adding them, reuse the same `Mailer` interface and SMTP configuration above.
