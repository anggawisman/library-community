import { createAppFromUrl } from "./app.js";
import { ConsoleMailer } from "./mailer.js";

const port = Number(process.env.PORT ?? 4000);
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://dev:dev@localhost:5433/community_member_shelves";

const app = await createAppFromUrl(databaseUrl, new ConsoleMailer());

app.listen(port, () => {
  console.log(`Community Shelves API listening on http://localhost:${port}`);
  console.log(`Database: ${databaseUrl.replace(/:[^:@]+@/, ":***@")}`);
});
