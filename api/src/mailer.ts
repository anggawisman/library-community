export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}

export class ConsoleMailer implements Mailer {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.log("\n========== DEV EMAIL ==========");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(body);
    console.log("================================\n");
  }
}
