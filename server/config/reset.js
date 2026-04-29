import { pool } from "./database.js";
import "./dotenv.js";
import { shopItems } from "../../client/src/data/shopItems.js";
import { fileURLToPath } from "url";
import path from "path";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runQueryWithRetry = async (query, label, retries = 3) => {
	let attempt = 0;

	while (attempt <= retries) {
		try {
			await pool.query(query);
			return true;
		} catch (err) {
			const isRetryable =
				err?.code === "ECONNRESET" || err?.code === "ETIMEDOUT";

			if (!isRetryable || attempt === retries) {
				console.error(`⚠️ Error creating ${label} table\n${err}`);
				return false;
			}

			const backoffMs = 1000 * (attempt + 1);
			console.warn(`⚠️ ${label}: ${err.code}. Retrying in ${backoffMs}ms...`);
			await wait(backoffMs);
		}

		attempt += 1;
	}

	return false;
};

export const createUsersTable = async () => {
	const createUsersTableQuery = `
      DROP TABLE IF EXISTS users CASCADE;

      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        profilePicture TEXT,
        coins INTEGER NOT NULL DEFAULT 500 CHECK (coins >= 0),
        createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

	const ok = await runQueryWithRetry(createUsersTableQuery, "users");
	if (ok) {
		console.log("✅ users table created successfully!");
	}

	return ok;
};

const createCatsTable = async () => {
	const createCatsTableQuery = `
      DROP TABLE IF EXISTS cats CASCADE;

      CREATE TABLE IF NOT EXISTS cats (
        id SERIAL PRIMARY KEY,
        userId TEXT NOT NULL UNIQUE REFERENCES users(uid) ON DELETE CASCADE,
        name TEXT NOT NULL,
        image TEXT,
        energy INTEGER NOT NULL DEFAULT 100 CHECK (energy >= 0)
      );
    `;

	const ok = await runQueryWithRetry(createCatsTableQuery, "cats");
	if (ok) {
		console.log("✅ cats table created successfully!");
	}

	return ok;
};

const createPomodoroProfilesTable = async () => {
	const createPomodoroProfilesTableQuery = `
      DROP TABLE IF EXISTS pomodoro_profiles CASCADE;

      CREATE TABLE IF NOT EXISTS pomodoro_profiles (
        id SERIAL PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        name TEXT NOT NULL,
        timeOn INTEGER NOT NULL CHECK (timeOn > 0),
        timeBreak INTEGER NOT NULL CHECK (timeBreak > 0),
        timeLongBreak INTEGER NOT NULL CHECK (timeLongBreak > 0),
        isDefault BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS one_default_profile_per_user
        ON pomodoro_profiles (userId)
        WHERE isDefault = TRUE;
    `;

	const ok = await runQueryWithRetry(
		createPomodoroProfilesTableQuery,
		"pomodoro_profiles",
	);
	if (ok) {
		console.log("✅ pomodoro_profiles table created successfully!");
	}

	return ok;
};

const createStudySessionsTable = async () => {
	const createStudySessionsTableQuery = `
      DROP TABLE IF EXISTS study_sessions CASCADE;

      CREATE TABLE IF NOT EXISTS study_sessions (
        id SERIAL PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        profileId INTEGER REFERENCES pomodoro_profiles(id) ON DELETE SET NULL,
        startTime TIMESTAMPTZ NOT NULL,
        endTime TIMESTAMPTZ,
        coinsEarned INTEGER NOT NULL DEFAULT 0 CHECK (coinsEarned >= 0)
      );
    `;

	const ok = await runQueryWithRetry(
		createStudySessionsTableQuery,
		"study_sessions",
	);
	if (ok) {
		console.log("✅ study_sessions table created successfully!");
	}

	return ok;
};

export const createShopItemsTable = async () => {
	const createShopItemsTableQuery = `
      DROP TABLE IF EXISTS shop_items CASCADE;

      CREATE TABLE IF NOT EXISTS shop_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        image TEXT,
        category TEXT NOT NULL,
        price INTEGER NOT NULL CHECK (price >= 0)
      );
    `;

	const ok = await runQueryWithRetry(createShopItemsTableQuery, "shop_items");
	if (ok) {
		console.log("✅ shop_items table created successfully!");
	}

	return ok;
};

const createInventoryTable = async () => {
	const createInventoryTableQuery = `
      DROP TABLE IF EXISTS inventory CASCADE;

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        shopItemId INTEGER NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
        equipped BOOLEAN NOT NULL DEFAULT FALSE,
        acquiredAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (userId, shopItemId)
      );
    `;

	const ok = await runQueryWithRetry(createInventoryTableQuery, "inventory");
	if (ok) {
		console.log("✅ inventory table created successfully!");
	}

	return ok;
};

const createTasksTable = async () => {
	const createTasksTableQuery = `
      DROP TABLE IF EXISTS tasks CASCADE;

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completedAt TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_user_completed
      ON tasks (userId, completed);

      CREATE INDEX IF NOT EXISTS idx_tasks_created_at
      ON tasks (createdAt DESC);
    `;

	const ok = await runQueryWithRetry(createTasksTableQuery, "tasks");
	if (ok) {
		console.log("✅ tasks table created successfully!");
	}

	return ok;
};

export const seedShopItemsTable = async () => {
	await createShopItemsTable();

	console.log("Seeding shop items");

	try {
		for (const item of shopItems) {
			const insertQuery = `
				INSERT INTO shop_items (name, image, category, price) 
				VALUES ($1, $2, $3, $4)
			`;

			const values = [item.name, item.img, item.category, item.price];

			await pool.query(insertQuery, values);
			console.log(`✅ ${item.name} added successfully`);
		}
		console.log("✅ shop_items table seeded successfully!");
		return true;
	} catch (err) {
		console.error("⚠️ Error seeding shop items table\n", err);
		return false;
	}
};

export const seedDatabase = async ({ closePool = true } = {}) => {
	let hasFailures = false;

	try {
		const steps = [
			createUsersTable,
			createCatsTable,
			createPomodoroProfilesTable,
			seedShopItemsTable,
			createStudySessionsTable,
			createInventoryTable,
			createTasksTable,
		];

		for (const step of steps) {
			const ok = await step();
			if (!ok) {
				hasFailures = true;
			}
		}

		if (hasFailures) {
			console.error("⚠️ database reset finished with failures");
			if (closePool) process.exitCode = 1;
			return false;
		}

		console.log("✅ database tables created successfully!");
		return true;
	} catch (err) {
		console.error(`⚠️ Error seeding database\n${err}`);
		if (closePool) process.exitCode = 1;
		return false;
	} finally {
		if (closePool) {
			await pool.end();
		}
	}
};

// Auto-run only when this script is executed directly
if (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	console.log("🔄 Starting database reset...");
	await seedDatabase({ closePool: true });
}
