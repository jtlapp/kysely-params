import { Kysely, Generated } from 'kysely';

// list tables after those they depend on
const TABLE_NAMES = ['users'];

export interface Database {
  users: Users;
}

export interface Users {
  id: Generated<number>;
  handle: string;
  name: string;
  nickname: string | null;
  birthYear: number | null;
}

export async function createTables(db: Kysely<Database>) {
  await db.schema
    .createTable('users')
    .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey())
    .addColumn('handle', 'varchar(255)', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('nickname', 'varchar(255)')
    .addColumn('birthYear', 'integer')
    .execute();

  return db;
}

export async function dropTables(db: Kysely<Database>): Promise<void> {
  for (const table of TABLE_NAMES) {
    await db.schema.dropTable(table).ifExists().execute();
  }
}
