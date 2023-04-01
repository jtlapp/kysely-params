import { Kysely } from 'kysely';

import { createDB, resetDB, destroyDB } from '../utils/test-setup';
import { Database } from '../utils/test-tables';
import '../lib/insert-params';

let db: Kysely<Database>;

beforeAll(async () => {
  db = await createDB();
});
beforeEach(() => resetDB(db));
afterAll(() => destroyDB(db));

it('parameterizes inserted strings and numbers with non-null values', async () => {
  type Params = {
    handleParam: string;
    birthYearParam: number | null;
  };
  const user = {
    name: 'John Smith',
    // leave out nickname
    handle: 'jsmith',
    birthYear: 1990,
  };

  const parameterized = db
    .insertInto('users')
    .parameterize<Params>(({ qb, p }) =>
      qb
        .values({
          handle: p.param('handleParam'),
          name: user.name,
          birthYear: p.param('birthYearParam'),
        })
        .returning('id')
    );
  const result = await parameterized.executeTakeFirst(db, {
    handleParam: user.handle,
    birthYearParam: user.birthYear,
  });

  expect(result).toEqual({ id: 1 });

  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', user.handle)
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, id: 1, nickname: null });
});

it('parameterizes inserted strings and numbers with null values', async () => {
  type Params = {
    nicknameParam: string | null;
    birthYearParam: number | null;
  };
  const user = {
    name: 'John Smith',
    nickname: null,
    handle: 'jsmith',
    birthYear: null,
  };

  const parameterized = db
    .insertInto('users')
    .parameterize<Params>(({ qb, p }) =>
      qb
        .values({
          handle: user.handle,
          name: user.name,
          nickname: p.param('nicknameParam'),
          birthYear: p.param('birthYearParam'),
        })
        .returning('id')
    );
  const result = await parameterized.executeTakeFirst(db, {
    nicknameParam: user.nickname,
    birthYearParam: user.birthYear,
  });

  expect(result).toEqual({ id: 1 });

  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', user.handle)
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, id: 1 });
});
