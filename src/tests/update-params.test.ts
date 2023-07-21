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

const user1 = {
  name: 'John Smith',
  nickname: 'Johnny',
  handle: 'jsmith',
  birthYear: 1980,
};
const user2 = {
  name: 'John McSmith',
  nickname: 'Johnny',
  handle: 'jmsmith',
  birthYear: 1990,
};
const user3 = {
  name: 'Jane Doe',
  nickname: 'Jane',
  handle: 'jdoe',
  birthYear: 1990,
};

it("instantiates update values and 'where' selections, with multiple executions", async () => {
  interface Params {
    toBirthYear: number;
    whereNickname: string;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = parameterizeQuery(
    db.updateTable('users')
  ).asFollows<Params>(({ qb, param }) =>
    qb
      .set({
        birthYear: param('toBirthYear'),
        handle: 'newHandle',
      })
      .where('nickname', '=', param('whereNickname'))
  );

  // First execution

  const compiledQuery1 = parameterization.instantiate({
    toBirthYear: 2000,
    whereNickname: user2.nickname,
  });
  const result1 = await db.executeQuery(compiledQuery1);
  expect(Number(result1?.numAffectedRows)).toEqual(2);

  // Second execution

  const compiledQuery2 = parameterization.instantiate({
    toBirthYear: 2010,
    whereNickname: user3.nickname,
  });
  const result2 = await db.executeQuery(compiledQuery2);
  expect(Number(result2?.numAffectedRows)).toEqual(1);

  const users = await db.selectFrom('users').selectAll().execute();
  expect(users).toEqual([
    { ...user1, id: 1, handle: 'newHandle', birthYear: 2000 },
    { ...user2, id: 2, handle: 'newHandle', birthYear: 2000 },
    { ...user3, id: 3, handle: 'newHandle', birthYear: 2010 },
  ]);
});

it("parameterizes update values and 'where' selections, with multiple executions", async () => {
  interface Params {
    toBirthYear: number;
    whereNickname: string;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  // First execution

  const parameterization = parameterizeQuery(
    db.updateTable('users')
  ).asFollows<Params>(({ qb, param }) =>
    qb
      .set({
        birthYear: param('toBirthYear'),
        handle: 'newHandle',
      })
      .where('nickname', '=', param('whereNickname'))
  );

  const result1 = await parameterization.execute(db, {
    toBirthYear: 2000,
    whereNickname: user2.nickname,
  });
  expect(Number(result1.numAffectedRows)).toEqual(2);

  // Second execution

  const result2 = await parameterization.executeTakeFirst(db, {
    toBirthYear: 2010,
    whereNickname: user3.nickname,
  });
  expect(result2).toBeUndefined();

  const users = await db.selectFrom('users').selectAll().execute();
  expect(users).toEqual([
    { ...user1, id: 1, handle: 'newHandle', birthYear: 2000 },
    { ...user2, id: 2, handle: 'newHandle', birthYear: 2000 },
    { ...user3, id: 3, handle: 'newHandle', birthYear: 2010 },
  ]);
});

it('parameterizes update values accepting nulls', async () => {
  interface Params {
    toBirthYear: number | null;
    whereNickname: string;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = parameterizeQuery(
    db.updateTable('users')
  ).asFollows<Params>(({ qb, param }) =>
    qb
      .set({
        birthYear: param('toBirthYear'),
      })
      .where('nickname', '=', param('whereNickname'))
  );

  const result1 = await parameterization.execute(db, {
    toBirthYear: null,
    whereNickname: user2.nickname,
  });
  expect(Number(result1.numAffectedRows)).toEqual(2);

  const result2 = await parameterization.executeTakeFirst(db, {
    toBirthYear: 2010,
    whereNickname: user3.nickname,
  });
  expect(result2).toBeUndefined();

  const users = await db.selectFrom('users').selectAll().execute();
  expect(users).toEqual([
    { ...user1, id: 1, birthYear: null },
    { ...user2, id: 2, birthYear: null },
    { ...user3, id: 3, birthYear: 2010 },
  ]);
});

it('parameterizes without defined parameters', async () => {
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = parameterizeQuery(db.updateTable('users')).asFollows(
    ({ qb }) =>
      qb
        .set({
          birthYear: 2000,
          handle: 'newHandle',
        })
        .where('nickname', '=', 'Johnny')
  );

  const result1 = await parameterization.execute(db, {});

  expect(Number(result1.numAffectedRows)).toEqual(2);

  const users = await db.selectFrom('users').selectAll().execute();
  expect(users).toEqual([
    { ...user1, id: 1, handle: 'newHandle', birthYear: 2000 },
    { ...user2, id: 2, handle: 'newHandle', birthYear: 2000 },
    { ...user3, id: 3, handle: 'jdoe', birthYear: 1990 },
  ]);
});

ignore('disallows incompatible set parameter types', () => {
  interface InvalidParams {
    sourceHandle: number;
    sourceName: string | null;
  }

  parameterizeQuery(db.updateTable('users')).asFollows<InvalidParams>(
    ({ qb, param }) =>
      qb.set({
        //@ts-expect-error - invalid parameter type
        handle: param('sourceHandle'),
        name: 'John Smith',
      })
  );

  parameterizeQuery(db.updateTable('users')).asFollows<InvalidParams>(
    ({ qb, param }) =>
      qb.set({
        handle: 'jsmith',
        //@ts-expect-error - invalid parameter type
        name: param('sourceName'),
      })
  );
});

ignore('restricts a set generated column parameter', async () => {
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

ignore('array parameters are not allowed', () => {
  interface InvalidParams {
    targetBirthYears: number[];
  }
  parameterizeQuery(db.updateTable('users'))
    // @ts-expect-error - invalid parameter type
    .asFollows<InvalidParams>(({ qb, param }) =>
      qb
        .set({ nickname: 'newNickname' })
        .where('birthYear', 'in', param('targetBirthYears'))
    );
});

ignore('disallows incompatible parameter types', () => {
  interface InvalidParams {
    targetHandle: number;
  }
  parameterizeQuery(db.updateTable('users')).asFollows<InvalidParams>(
    ({ qb, param }) =>
      qb
        .set({ nickname: 'newNickname' })
        //@ts-expect-error - invalid parameter type
        .where('handle', '=', param('targetHandle'))
  );
});

ignore('restricts provided parameters', async () => {
  interface ValidParams {
    targetHandle: string;
    targetBirthYear: number;
  }

  const parameterization = parameterizeQuery(
    db.updateTable('users')
  ).asFollows<ValidParams>(({ qb, param }) =>
    qb
      .set({ nickname: 'newNickname' })
      .where('handle', '=', param('targetHandle'))
      .where('name', '=', 'John Smith')
      .where('birthYear', '=', param('targetBirthYear'))
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
    targetBirthYear: '2020',
    targetHandle: 'jsmith',
  });
  await parameterization.executeTakeFirst(db, {
    //@ts-expect-error - invalid parameter type
    targetBirthYear: '2020',
    targetHandle: 'jsmith',
  });

  await parameterization.execute(db, {
    //@ts-expect-error - invalid parameter type
    targetHandle: null,
  });
  await parameterization.executeTakeFirst(db, {
    //@ts-expect-error - invalid parameter type
    targetHandle: null,
  });

  //@ts-expect-error - missing parameter name
  await parameterization.execute(db, {
    targetBirthYear: 2020,
  });
  //@ts-expect-error - missing parameter name
  await parameterization.executeTakeFirst(db, {
    targetBirthYear: 2020,
  });
  //@ts-expect-error - missing parameter name
  await parameterization.execute(db, {});
  //@ts-expect-error - missing parameter name
  await parameterization.executeTakeFirst(db, {});
});
