import { Kysely } from 'kysely';

import { createDB, resetDB, destroyDB } from '../utils/test-setup';
import { Database } from '../utils/test-tables';
import '../lib/insert-params';
import { ignore } from '../utils/test-utils';

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

  const parameterization = db
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
  const result = await parameterization.executeTakeFirst(db, {
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

  const parameterization = db
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
  const result = await parameterization.executeTakeFirst(db, {
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

it('parameterizes and generates a generated column', async () => {
  type Params = {
    idParam?: number;
  };
  const user = {
    handle: 'jsmith',
    name: 'John Smith',
    nickname: null,
    birthYear: null,
  };

  const parameterization = db
    .insertInto('users')
    .parameterize<Params>(({ qb, p }) =>
      qb.values({
        id: p.param('idParam'),
        name: user.name,
        handle: user.handle,
      })
    );
  const result = await parameterization.executeTakeFirst(db, {});

  expect(result).toBeUndefined();
  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', user.handle)
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, id: 1 });
});

it('parameterizes and assigns a generated column', async () => {
  type Params = {
    idParam?: number;
  };
  const user = {
    handle: 'jsmith',
    name: 'John Smith',
    nickname: null,
    birthYear: null,
  };

  const parameterization = db
    .insertInto('users')
    .parameterize<Params>(({ qb, p }) =>
      qb.values({
        id: p.param('idParam'),
        name: user.name,
        handle: user.handle,
      })
    );
  const result = await parameterization.executeTakeFirst(db, { idParam: 100 });

  expect(result).toBeUndefined();
  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', user.handle)
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, id: 100 });
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

  const parameterization = db
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
  const result = await parameterization.execute(db, {
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

ignore('disallows incompatible parameter types', () => {
  type InvalidParams = {
    handleParam: number;
    nameParam: string | null;
  };

  db.insertInto('users').parameterize<InvalidParams>(({ qb, p }) =>
    //@ts-expect-error - invalid parameter type
    qb.values({
      handle: p.param('handleParam'),
      name: 'John Smith',
    })
  );

  db.insertInto('users').parameterize<InvalidParams>(({ qb, p }) =>
    qb.values({
      handle: 'jsmith',
      //@ts-expect-error - invalid parameter type
      name: p.param('nameParam'),
    })
  );
});

ignore('restricts a generated column parameter', async () => {
  type InvalidParams = {
    idParam?: string;
  };

  db.insertInto('users').parameterize<InvalidParams>(({ qb, p }) =>
    //@ts-expect-error - invalid parameter type
    qb.values({
      id: p.param('idParam'),
      name: 'John Smith',
      handle: 'jsmith',
    })
  );
});

ignore('restricts provided parameters', async () => {
  type ValidParams = {
    handleParam: string;
    birthYearParam: number | null;
  };

  const parameterization = db
    .insertInto('users')
    .parameterize<ValidParams>(({ qb, p }) =>
      qb.values({
        handle: p.param('handleParam'),
        name: 'John Smith',
        birthYear: p.param('birthYearParam'),
      })
    );

  await parameterization.execute(db, {
    //@ts-expect-error - invalid parameter name
    invalidParam: 'invalid',
  });
  await parameterization.executeTakeFirst(db, {
    //@ts-expect-error - invalid parameter name
    invalidParam: 'invalid',
  });

  await parameterization.execute(db, {
    //@ts-expect-error - invalid parameter type
    birthYearParam: '2020',
    handleParam: 'jsmith',
  });
  await parameterization.executeTakeFirst(db, {
    //@ts-expect-error - invalid parameter type
    birthYearParam: '2020',
    handleParam: 'jsmith',
  });

  await parameterization.execute(db, {
    //@ts-expect-error - invalid parameter type
    handleParam: null,
    birthYearParam: null,
  });
  await parameterization.executeTakeFirst(db, {
    //@ts-expect-error - invalid parameter type
    handleParam: null,
    birthYearParam: null,
  });

  //@ts-expect-error - missing parameter name
  await parameterization.execute(db, {
    birthYearParam: 2020,
  });
  //@ts-expect-error - missing parameter name
  await parameterization.executeTakeFirst(db, {
    birthYearParam: 2020,
  });
});
