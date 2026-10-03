// 数据库访问层
// 支持两种模式：
// 1) 有 DATABASE_URL 时 → 直连 PostgreSQL（Neon / Vercel Postgres 等）
// 2) 无 DATABASE_URL 时 → 内存 + 文件（仅开发 / 演示，不持久化）
//
// 表结构为后期账号/付费/云同步预留扩展点
import { getEnv, log } from './index';

// 表结构（PostgreSQL DDL，首次建库使用）
export const DB_SCHEMA = `
-- 用户表（预留账号体系，现阶段 user_id 由设备生成的匿名标识）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- 用户ID（匿名UUID / 后期可接飞书/微信登录）
  email TEXT,
  nickname TEXT,
  plan TEXT NOT NULL DEFAULT 'free',   -- free / pro / premium（付费档位预留）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 个人参数（身高/体重/年龄/性别/活动系数/目标/缺口等）
CREATE TABLE IF NOT EXISTS user_params (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  height REAL NOT NULL DEFAULT 175,
  weight REAL NOT NULL DEFAULT 70,
  age INTEGER NOT NULL DEFAULT 25,
  gender TEXT NOT NULL DEFAULT 'male',
  activity_factor REAL NOT NULL DEFAULT 1.375,
  goal TEXT NOT NULL DEFAULT 'cut',
  deficit INTEGER NOT NULL DEFAULT 500,
  surplus INTEGER NOT NULL DEFAULT 300,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 自定义食物库
CREATE TABLE IF NOT EXISTS custom_foods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  weight_type TEXT NOT NULL DEFAULT 'other',
  carbs REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  note TEXT,
  source TEXT,                             -- 数据来源：usda / openfoodfacts / ai / manual
  source_id TEXT,                          -- 来源ID（USDA FDC ID / OFF barcode 等）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_foods_user_id ON custom_foods(user_id);

-- 每日饮食记录（一条 = 一天）
CREATE TABLE IF NOT EXISTS daily_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  mode TEXT NOT NULL DEFAULT 'training',   -- training / rest
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, record_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_records_user_date ON daily_records(user_id, record_date);

-- 饮食条目（某天吃了什么）
CREATE TABLE IF NOT EXISTS food_entries (
  id TEXT PRIMARY KEY,
  daily_record_id TEXT NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id TEXT NOT NULL,                   -- 内置食物ID 或 自定义食物ID 或 外部源ID
  food_name TEXT NOT NULL,                 -- 冗余存储食物名，便于历史记录回溯
  food_source TEXT,                        -- builtin / custom / usda / openfoodfacts
  grams REAL NOT NULL DEFAULT 100,
  carbs REAL NOT NULL DEFAULT 0,           -- 冗余该条目计算时的每100g碳水
  protein REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_food_entries_record ON food_entries(daily_record_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_user ON food_entries(user_id);
`;

export interface UserParamsRow {
  height: number;
  weight: number;
  age: number;
  gender: string;
  activity_factor: number;
  goal: string;
  deficit: number;
  surplus: number;
}

export interface CustomFoodRow {
  id: string;
  name: string;
  category: string;
  weight_type: string;
  carbs: number;
  protein: number;
  fat: number;
  note: string | null;
  source: string | null;
  source_id: string | null;
}

export interface FoodEntryRow {
  id: string;
  food_id: string;
  food_name: string;
  food_source: string | null;
  grams: number;
  carbs: number;
  protein: number;
  fat: number;
}

/**
 * 数据库抽象层
 */
export interface IDatabase {
  ensureUser(userId: string): Promise<void>;
  getUserParams(userId: string): Promise<UserParamsRow | null>;
  saveUserParams(userId: string, params: UserParamsRow): Promise<void>;
  listCustomFoods(userId: string): Promise<CustomFoodRow[]>;
  addCustomFood(userId: string, food: Omit<CustomFoodRow, 'id'> & { id?: string }): Promise<CustomFoodRow>;
  updateCustomFood(userId: string, id: string, patch: Partial<CustomFoodRow>): Promise<CustomFoodRow | null>;
  deleteCustomFood(userId: string, id: string): Promise<boolean>;
  getDailyRecord(userId: string, date: string): Promise<{ id: string; mode: string; entries: FoodEntryRow[] } | null>;
  setDailyMode(userId: string, date: string, mode: string): Promise<void>;
  setEntries(userId: string, date: string, entries: FoodEntryRow[]): Promise<void>;
}

// 懒加载 pg，没有 DATABASE_URL 时用内存实现
let _db: IDatabase | null = null;

export async function getDb(): Promise<IDatabase> {
  if (_db) return _db;
  const url = getEnv('DATABASE_URL');
  if (url) {
    _db = await createPostgresDb(url);
  } else {
    log.warn('[DB] DATABASE_URL 未配置，使用内存数据库（数据不持久化，仅供开发演示）');
    _db = createInMemoryDb();
  }
  return _db;
}

// ---------- 内存实现（开发 / 演示兜底） ----------

function createInMemoryDb(): IDatabase {
  const users = new Map<string, { created_at: number }>();
  const params = new Map<string, UserParamsRow>();
  const foods = new Map<string, CustomFoodRow & { user_id: string }>();
  // key = user_id:date
  const records = new Map<string, { id: string; mode: string; entries: FoodEntryRow[] }>();

  return {
    async ensureUser(userId) {
      if (!users.has(userId)) {
        users.set(userId, { created_at: Date.now() });
      }
    },
    async getUserParams(userId) {
      return params.get(userId) ?? null;
    },
    async saveUserParams(userId, p) {
      params.set(userId, p);
    },
    async listCustomFoods(userId) {
      return [...foods.values()].filter((f) => f.user_id === userId);
    },
    async addCustomFood(userId, food) {
      const id = food.id ?? `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const row = { ...food, id, note: food.note ?? null, source: food.source ?? null, source_id: food.source_id ?? null, user_id: userId } as CustomFoodRow & { user_id: string };
      foods.set(id, row);
      return row;
    },
    async updateCustomFood(userId, id, patch) {
      const existing = foods.get(id);
      if (!existing || existing.user_id !== userId) return null;
      const next = { ...existing, ...patch };
      foods.set(id, next);
      return next;
    },
    async deleteCustomFood(userId, id) {
      const existing = foods.get(id);
      if (!existing || existing.user_id !== userId) return false;
      foods.delete(id);
      return true;
    },
    async getDailyRecord(userId, date) {
      const key = `${userId}:${date}`;
      const rec = records.get(key);
      return rec ?? null;
    },
    async setDailyMode(userId, date, mode) {
      const key = `${userId}:${date}`;
      let rec = records.get(key);
      if (!rec) {
        rec = { id: key, mode, entries: [] };
        records.set(key, rec);
      } else {
        rec.mode = mode;
      }
    },
    async setEntries(userId, date, entries) {
      const key = `${userId}:${date}`;
      let rec = records.get(key);
      if (!rec) {
        rec = { id: key, mode: 'training', entries };
        records.set(key, rec);
      } else {
        rec.entries = entries;
      }
    },
  };
}

// ---------- PostgreSQL 实现 ----------

async function createPostgresDb(url: string): Promise<IDatabase> {
  // pg 由平台自动管理，运行时动态加载，避免编译期模块解析报错
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pg: any = null;
  // 方式1：Node.js 原生 require（Vercel / Node serverless 环境）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (typeof g.require === 'function') {
    try { pg = g.require('pg'); } catch { /* ignore */ }
  }
  // 方式2：Function 构造器间接 require，绕过 import 静态分析
  if (!pg) {
    try {
      // eslint-disable-next-line no-new-func
      const loader = new Function('return require("pg")');
      pg = loader();
    } catch { /* ignore */ }
  }
  if (!pg) {
    throw new Error('pg module is not available in this runtime');
  }
  const Pool = pg.Pool;
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('neon.tech') || url.includes('vercel-postgres') || url.includes('postgres.vercel')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  // 初始化 schema
  try {
    await pool.query(DB_SCHEMA);
    log.info('[DB] Schema initialized');
  } catch (err) {
    log.error('[DB] Schema init failed:', String(err));
  }

  return {
    async ensureUser(userId) {
      await pool.query(
        `INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
        [userId],
      );
    },
    async getUserParams(userId) {
      const { rows } = await pool.query(
        `SELECT height, weight, age, gender, activity_factor, goal, deficit, surplus
         FROM user_params WHERE user_id = $1`,
        [userId],
      );
      return rows[0] ?? null;
    },
    async saveUserParams(userId, p) {
      await pool.query(
        `INSERT INTO user_params (user_id, height, weight, age, gender, activity_factor, goal, deficit, surplus, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           height = EXCLUDED.height,
           weight = EXCLUDED.weight,
           age = EXCLUDED.age,
           gender = EXCLUDED.gender,
           activity_factor = EXCLUDED.activity_factor,
           goal = EXCLUDED.goal,
           deficit = EXCLUDED.deficit,
           surplus = EXCLUDED.surplus,
           updated_at = NOW()`,
        [userId, p.height, p.weight, p.age, p.gender, p.activity_factor, p.goal, p.deficit, p.surplus],
      );
    },
    async listCustomFoods(userId) {
      const { rows } = await pool.query(
        `SELECT id, name, category, weight_type, carbs, protein, fat, note, source, source_id
         FROM custom_foods WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      );
      return rows;
    },
    async addCustomFood(userId, food) {
      const id = food.id ?? `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { rows } = await pool.query(
        `INSERT INTO custom_foods (id, user_id, name, category, weight_type, carbs, protein, fat, note, source, source_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, name, category, weight_type, carbs, protein, fat, note, source, source_id`,
        [id, userId, food.name, food.category, food.weight_type, food.carbs, food.protein, food.fat, food.note ?? null, food.source ?? null, food.source_id ?? null],
      );
      return rows[0];
    },
    async updateCustomFood(userId, id, patch) {
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;
        fields.push(`${k} = $${idx++}`);
        values.push(v);
      }
      if (fields.length === 0) {
        const { rows } = await pool.query(
          `SELECT id, name, category, weight_type, carbs, protein, fat, note, source, source_id
           FROM custom_foods WHERE id = $1 AND user_id = $2`,
          [id, userId],
        );
        return rows[0] ?? null;
      }
      fields.push(`updated_at = NOW()`);
      values.push(id, userId);
      const { rows } = await pool.query(
        `UPDATE custom_foods SET ${fields.join(', ')}
         WHERE id = $${idx} AND user_id = $${idx + 1}
         RETURNING id, name, category, weight_type, carbs, protein, fat, note, source, source_id`,
        values,
      );
      return rows[0] ?? null;
    },
    async deleteCustomFood(userId, id) {
      const result = await pool.query(
        `DELETE FROM custom_foods WHERE id = $1 AND user_id = $2`,
        [id, userId],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async getDailyRecord(userId, date) {
      // upsert 一条记录
      await pool.query(
        `INSERT INTO daily_records (id, user_id, record_date, mode)
         VALUES ($1, $2, $3, 'training')
         ON CONFLICT (user_id, record_date) DO NOTHING`,
        [`${userId}-${date}`, userId, date],
      );
      const { rows: recRows } = await pool.query(
        `SELECT id, mode FROM daily_records WHERE user_id = $1 AND record_date = $2`,
        [userId, date],
      );
      if (recRows.length === 0) return null;
      const { rows: entryRows } = await pool.query(
        `SELECT id, food_id, food_name, food_source, grams, carbs, protein, fat
         FROM food_entries WHERE daily_record_id = $1 ORDER BY created_at ASC`,
        [recRows[0].id],
      );
      return {
        id: recRows[0].id,
        mode: recRows[0].mode,
        entries: entryRows,
      };
    },
    async setDailyMode(userId, date, mode) {
      await pool.query(
        `INSERT INTO daily_records (id, user_id, record_date, mode)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, record_date) DO UPDATE SET mode = EXCLUDED.mode, updated_at = NOW()`,
        [`${userId}-${date}`, userId, date, mode],
      );
    },
    async setEntries(userId, date, entries) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // upsert daily record
        const recId = `${userId}-${date}`;
        await client.query(
          `INSERT INTO daily_records (id, user_id, record_date, mode)
           VALUES ($1, $2, $3, 'training')
           ON CONFLICT (user_id, record_date) DO NOTHING`,
          [recId, userId, date],
        );
        // 删除旧条目
        await client.query(`DELETE FROM food_entries WHERE daily_record_id = $1`, [recId]);
        // 批量插入新条目
        for (const e of entries) {
          await client.query(
            `INSERT INTO food_entries (id, daily_record_id, user_id, food_id, food_name, food_source, grams, carbs, protein, fat)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [e.id, recId, userId, e.food_id, e.food_name, e.food_source ?? null, e.grams, e.carbs, e.protein, e.fat],
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  };
}
