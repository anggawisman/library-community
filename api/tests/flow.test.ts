import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { createPool, resetDb, type Db } from "../src/db.js";
import type { Mailer } from "../src/mailer.js";

class CaptureMailer implements Mailer {
  public messages: Array<{ to: string; subject: string; body: string }> = [];
  async send(to: string, subject: string, body: string): Promise<void> {
    this.messages.push({ to, subject, body });
  }
}

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://dev:dev@localhost:5433/community_member_shelves_test";

describe("member-admin product flow", () => {
  let db: Db;
  let app: Express;
  let mailer: CaptureMailer;
  let adminToken: string;

  beforeAll(async () => {
    db = createPool(TEST_DATABASE_URL);
    mailer = new CaptureMailer();
    app = await createApp(db, mailer);
  });

  afterAll(async () => {
    await db.end();
  });

  beforeEach(async () => {
    mailer.messages = [];
    await resetDb(db);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@club.local", password: "password123" });
    adminToken = login.body.data.token;
  });

  it("registers pending member who cannot propose until approved and password changed", async () => {
    const register = await request(app).post("/api/auth/register").send({
      email: "new@club.local",
      name: "New Member",
      password: "initial1",
    });
    expect(register.status).toBe(201);
    expect(register.body.data.status).toBe("pending");

    const pendingLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "new@club.local", password: "initial1" });
    expect(pendingLogin.status).toBe(403);

    const approve = await request(app)
      .patch(`/api/admin/members/${register.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "approved" });
    expect(approve.status).toBe(200);
    expect(approve.body.data.mustChangePassword).toBe(true);
    expect(mailer.messages).toHaveLength(1);
    const tempPassword = mailer.messages[0].body.match(/Temporary password: (\w+)/)?.[1];
    expect(tempPassword).toBeTruthy();

    const firstLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "new@club.local", password: tempPassword });
    expect(firstLogin.status).toBe(200);
    expect(firstLogin.body.data.user.mustChangePassword).toBe(true);
    const memberToken = firstLogin.body.data.token;

    const blockedPropose = await request(app)
      .post("/api/shelves")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({
        title: "Too soon",
        goal: "g",
        category: "Habit",
        mindShapingIntent: "m",
      });
    expect(blockedPropose.status).toBe(403);

    const change = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ currentPassword: tempPassword, newPassword: "secure99" });
    expect(change.status).toBe(200);

    const relogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "new@club.local", password: "secure99" });
    const readyToken = relogin.body.data.token;

    const propose = await request(app)
      .post("/api/shelves")
      .set("Authorization", `Bearer ${readyToken}`)
      .send({
        title: "Stoic mornings",
        goal: "Calm decisions",
        category: "Philosophy",
        mindShapingIntent: "Reflect daily",
      });
    expect(propose.status).toBe(201);
    expect(propose.body.data.status).toBe("proposed");

    const secondPropose = await request(app)
      .post("/api/shelves")
      .set("Authorization", `Bearer ${readyToken}`)
      .send({
        title: "Second shelf",
        goal: "Not allowed",
        category: "Habit",
        mindShapingIntent: "Nope",
      });
    expect(secondPropose.status).toBe(409);

    const accept = await request(app)
      .patch(`/api/shelves/${propose.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "accepted", category: "Habit" });
    expect(accept.status).toBe(200);
    expect(accept.body.data.status).toBe("accepted");
    expect(accept.body.data.category).toBe("Habit");

    const publicList = await request(app).get("/api/shelves");
    expect(publicList.status).toBe(200);
    expect(publicList.body.data).toHaveLength(1);

    const filtered = await request(app).get("/api/shelves?category=Habit");
    expect(filtered.body.data).toHaveLength(1);

    const book = await request(app)
      .post(`/api/shelves/${propose.body.data.id}/books`)
      .set("Authorization", `Bearer ${readyToken}`)
      .send({ title: "Meditations", author: "Marcus Aurelius" });
    expect(book.status).toBe(201);

    const borrow = await request(app)
      .patch(`/api/books/${book.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "borrowed", borrowerId: register.body.data.id });
    expect(borrow.status).toBe(200);
    expect(borrow.body.data.status).toBe("borrowed");
    expect(borrow.body.data.borrowerId).toBe(register.body.data.id);
    expect(borrow.body.data.borrowedAt).toBeTruthy();

    const event = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        shelfId: propose.body.data.id,
        title: "Habit workshop",
        description: "Practice systems",
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        capacity: 10,
      });
    expect(event.status).toBe(201);
    expect(event.body.data.status).toBe("accepted");

    const memberPropose = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${readyToken}`)
      .send({
        shelfId: propose.body.data.id,
        title: "Member meetup",
        startsAt: new Date(Date.now() + 172800000).toISOString(),
      });
    expect(memberPropose.status).toBe(201);
    expect(memberPropose.body.data.status).toBe("proposed");

    const publicBefore = await request(app).get("/api/events");
    expect(publicBefore.body.data.some((e: { title: string }) => e.title === "Member meetup")).toBe(
      false,
    );

    const acceptEvent = await request(app)
      .patch(`/api/events/${memberPropose.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "accepted" });
    expect(acceptEvent.status).toBe(200);

    const join = await request(app)
      .post(`/api/events/${event.body.data.id}/register`)
      .set("Authorization", `Bearer ${readyToken}`);
    expect(join.status).toBe(201);

    const events = await request(app).get("/api/events");
    expect(events.body.data.length).toBeGreaterThanOrEqual(2);
    expect(events.body.data.find((e: { title: string }) => e.title === "Habit workshop").registrationCount).toBe(
      1,
    );

    const cats = await request(app).get("/api/categories");
    expect(cats.status).toBe(200);
    expect(cats.body.data.length).toBeGreaterThan(0);

    const newCat = await request(app)
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Mindfulness" });
    expect(newCat.status).toBe(201);
  });
});
