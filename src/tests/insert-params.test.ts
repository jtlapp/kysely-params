import { Kysely } from 'kysely';

import { createDB, resetDB, destroyDB } from '../utils/test-setup';
import { Database } from '../utils/test-tables';
import { ignore } from '../utils/test-utils';
import { parameterizeQuery } from '../lib/parameterizer';

let db: Kysely<Database>;

beforeAll(async () => {
  db = await createDB();
});
beforeEach(() => resetDB(db));
afterAll(() => destroyDB(db));

it('instantiates inserted strings and numbers', async () => {
  interface Params {
    sourceHandle: string;
    sourceBirthYear: number | null;
  }
  const user = {
    name: 'John Smith',
    // leave out nickname
    handle: 'jsmith',
    birthYear: 1990,
  };

  const parameterization = parameterizeQuery(
    db.insertInto('users').returning('id')
  ).asFollows<Params>(({ qb, param }) =>
    qb.values({
      handle: param('sourceHandle'),
      name: user.name,
      birthYear: param('sourceBirthYear'),
    })
  );
  const compiledQuery = parameterization.instantiate({
    sourceHandle: user.handle,
    sourceBirthYear: user.birthYear,
  });
  const result = await db.executeQuery(compiledQuery);
  expect(result?.rows).toEqual([{ id: 1 }]);

  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', user.handle)
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, id: 1, nickname: null });
});

it('parameterizes inserted strings and numbers with non-null values', async () => {
  interface Params {
    sourceHandle: string;
    sourceBirthYear: number | null;
  }
  const user = {
    name: 'John Smith',
    // leave out nickname
    handle: 'jsmith',
    birthYear: 1990,
  };

  const parameterization = parameterizeQuery(
    db.insertInto('users').returning('id')
  ).asFollows<Params>(({ qb, param }) =>
    qb.values({
      handle: param('sourceHandle'),
      name: user.name,
      birthYear: param('sourceBirthYear'),
    })
  );
  const result = await parameterization.executeTakeFirst(db, {
    sourceHandle: user.handle,
    sourceBirthYear: user.birthYear,
  });

  expect(result).toEqual({ id: 1 });
  // Make sure we can address properties by name.
  expect(result?.id).toBe(1);

  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', user.handle)
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, id: 1, nickname: null });
});

it('parameterizes inserted strings and numbers with null values', async () => {
  interface Params {
    sourceNickname: string | null;
    sourceBirthYear: number | null;
  }
  const user = {
    name: 'John Smith',
    nickname: null,
    handle: 'jsmith',
    birthYear: null,
  };

  const parameterization = parameterizeQuery(
    db.insertInto('users').returning('id')
  ).asFollows<Params>(({ qb, param }) =>
    qb.values({
      handle: user.handle,
      name: user.name,
      nickname: param('sourceNickname'),
      birthYear: param('sourceBirthYear'),
    })
  );
  const result = await parameterization.executeTakeFirst(db, {
    sourceNickname: user.nickname,
    sourceBirthYear: user.birthYear,
  });

  expect(result).toEqual({ id: 1 });

  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', user.handle)
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, id: 1 });
});

it('parameterizes a generated column, with multiple executions', async () => {
  interface Params {
    sourceId?: number;
  }
  const user = {
    handle: 'jsmith',
    name: 'John Smith',
    nickname: null,
    birthYear: null,
  };

  const parameterization = parameterizeQuery(
    db.insertInto('users')
  ).asFollows<Params>(({ qb, param }) =>
    qb.values({
      id: param('sourceId'),
      name: user.name,
      handle: user.handle,
    })
  );

  // First execution not assigning generated column.

  const result1 = await parameterization.executeTakeFirst(db, {});
  expect(result1).toBeUndefined();
  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', user.handle)
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, id: 1 });

  // Second execution assigning generated column.

  const result = await parameterization.executeTakeFirst(db, { sourceId: 100 });
  expect(result).toBeUndefined();
  const readUsers = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', user.handle)
    .execute();
  expect(readUsers).toEqual([
    { ...user, id: 1 },
    { ...user, id: 100 },
  ]);
});

it('parameterizes single query performing multiple insertions', async () => {
  interface Params {
    sourceName1and2: string;
    sourceNickname1: string;
    sourceBirthYear1: number;
    sourceBirthYear2: number;
  }
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

  const parameterization = parameterizeQuery(
    db.insertInto('users').returning('id')
  ).asFollows<Params>(({ qb, param }) =>
    qb.values([
      {
        handle: user1.handle,
        name: param('sourceName1and2'),
        nickname: param('sourceNickname1'),
        birthYear: param('sourceBirthYear1'),
      },
      {
        handle: user2.handle,
        name: param('sourceName1and2'),
        nickname: user2.nickname,
        birthYear: user2.birthYear,
      },
    ])
  );

  const result = await parameterization.execute(db, {
    sourceName1and2: user1.name,
    sourceNickname1: user1.nickname,
    sourceBirthYear1: user1.birthYear,
    sourceBirthYear2: user2.birthYear,
  });

  expect(result.rows).toEqual([{ id: 1 }, { id: 2 }]);
  // Make sure we can address properties by name.
  expect(result?.rows[0].id).toBe(1);

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

it('parameterizes without defined parameters', async () => {
  const user = {
    name: 'John Smith',
    nickname: null,
    handle: 'jsmith',
    birthYear: null,
  };

  const parameterization = parameterizeQuery(
    db.insertInto('users').returning('id')
  ).asFollows(({ qb }) => qb.values(user));

  const result = await parameterization.executeTakeFirst(db, {});
  expect(result).toEqual({ id: 1 });

  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', user.handle)
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, id: 1 });
});

ignore('disallows incompatible parameter types', () => {
  interface InvalidParams {
    sourceHandle: number;
    sourceName: string | null;
  }

  parameterizeQuery(db.insertInto('users')).asFollows<InvalidParams>(
    ({ qb, param }) =>
      qb.values({
        //@ts-expect-error - invalid parameter type
        handle: param('sourceHandle'),
        name: 'John Smith',
      })
  );

  parameterizeQuery(db.insertInto('users')).asFollows<InvalidParams>(
    ({ qb, param }) =>
      qb.values({
        handle: 'jsmith',
        //@ts-expect-error - invalid parameter type
        name: param('sourceName'),
      })
  );
});

ignore('restricts a generated column parameter', async () => {
  interface InvalidParams {
    sourceId?: string;
  }

  parameterizeQuery(db.insertInto('users')).asFollows<InvalidParams>(
    ({ qb, param }) =>
      qb.values({
        //@ts-expect-error - invalid parameter type
        id: param('sourceId'),
        name: 'John Smith',
        handle: 'jsmith',
      })
  );
});

ignore('restricts provided parameters', async () => {
  interface ValidParams {
    sourceHandle: string;
    sourceBirthYear: number | null;
  }

  const parameterization = parameterizeQuery(
    db.insertInto('users')
  ).asFollows<ValidParams>(({ qb, param }) =>
    qb.values({
      handle: param('sourceHandle'),
      name: 'John Smith',
      birthYear: param('sourceBirthYear'),
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
    sourceBirthYear: '2020',
    sourceHandle: 'jsmith',
  });
  await parameterization.executeTakeFirst(db, {
    //@ts-expect-error - invalid parameter type
    sourceBirthYear: '2020',
    sourceHandle: 'jsmith',
  });

  await parameterization.execute(db, {
    //@ts-expect-error - invalid parameter type
    sourceHandle: null,
    sourceBirthYear: null,
  });
  await parameterization.executeTakeFirst(db, {
    //@ts-expect-error - invalid parameter type
    sourceHandle: null,
    sourceBirthYear: null,
  });

  //@ts-expect-error - missing parameter name
  await parameterization.execute(db, {
    sourceBirthYear: 2020,
  });
  //@ts-expect-error - missing parameter name
  await parameterization.executeTakeFirst(db, {
    sourceBirthYear: 2020,
  });
  //@ts-expect-error - missing parameter name
  await parameterization.execute(db, {});
  //@ts-expect-error - missing parameter name
  await parameterization.executeTakeFirst(db, {});
});

ignore('restrict returned column names', async () => {
  interface ValidParams {
    sourceHandle: string;
    sourceBirthYear: number | null;
  }

  const parameterization = parameterizeQuery(
    db.insertInto('users').returning('id')
  ).asFollows<ValidParams>(({ qb, param }) =>
    qb.values({
      handle: param('sourceHandle'),
      name: 'John Smith',
      birthYear: param('sourceBirthYear'),
    })
  );

  const result1 = await parameterization.executeTakeFirst(db, {
    sourceHandle: 'jsmith',
    sourceBirthYear: 2020,
  });
  // @ts-expect-error - invalid column name
  result1?.notThere;

  const result2 = await parameterization.execute(db, {
    sourceHandle: 'jsmith',
    sourceBirthYear: 2020,
  });
  // @ts-expect-error - invalid column name
  result2.rows[0]?.notThere;
});
