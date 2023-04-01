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

it('parameterizes single query with multiple insertions', async () => {
  type Params = {
    nameParam1and2: string;
    nicknameParam1: string;
    birthYearParam1: number;
    birthYearParam2: number;
  };
  const user1 = {
    name: 'John Smith',
    nickname: 'Johny',
    handle: 'jsmith1',
    birthYear: 1990,
  };
  const user2 = {
    name: 'John Smith',
    nickname: null,
    handle: 'jsmith2',
    birthYear: 2000,
  };

  const parameterized = db
    .insertInto('users')
    .parameterize<Params>(({ qb, p }) =>
      qb
        .values([
          {
            handle: user1.handle,
            name: p.param('nameParam1and2'),
            nickname: p.param('nicknameParam1'),
            birthYear: p.param('birthYearParam1'),
          },
          {
            handle: user2.handle,
            name: p.param('nameParam1and2'),
            nickname: user2.nickname,
            birthYear: user2.birthYear,
          },
        ])
        .returning('id')
    );
  const result = await parameterized.execute(db, {
    nameParam1and2: user1.name,
    nicknameParam1: user1.nickname,
    birthYearParam1: user1.birthYear,
    birthYearParam2: user2.birthYear,
  });

  expect(result.rows).toEqual([{ id: 1 }, { id: 2 }]);

  const readUsers = await db
    .selectFrom('users')
    .selectAll()
    .where('name', '=', user1.name)
    .execute();
  expect(readUsers).toEqual([
    { ...user1, id: 1 },
    { ...user2, id: 2 },
  ]);
});
