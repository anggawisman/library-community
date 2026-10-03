import type { Pool } from "pg";

export async function migrate(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shelves (
      id UUID PRIMARY KEY,
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      category TEXT NOT NULL,
      mind_shaping_intent TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('proposed', 'accepted', 'rejected')),
      admin_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS books (
      id UUID PRIMARY KEY,
      shelf_id UUID NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'borrowed')),
      borrower_id UUID REFERENCES users(id) ON DELETE SET NULL,
      borrowed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY,
      shelf_id UUID NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ,
      capacity INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
      id UUID PRIMARY KEY,
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (event_id, user_id)
    );
  `);

  await pool.query(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS admin_note TEXT;
  `);

  await pool.query(`
    UPDATE events SET status = 'accepted' WHERE status IS NULL;
  `);

  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
      ALTER TABLE events ADD CONSTRAINT events_status_check
        CHECK (status IN ('proposed', 'accepted', 'rejected'));
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `);

  await pool.query(`
    ALTER TABLE events ALTER COLUMN status SET DEFAULT 'proposed';
    ALTER TABLE events ALTER COLUMN status SET NOT NULL;
  `);
}
