import { Kysely } from 'kysely';

import { createDB, resetDB, destroyDB } from '../utils/test-setup';
import { Database } from '../utils/test-tables';
import '../lib/update-params';
import { ignore } from '../utils/test-utils';

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

it("parameterizes update values and 'where' selections, with multiple executions", async () => {
  interface Params {
    toBirthYear: number;
    whereNickname: string;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  // First execution

  const parameterization = db
    .updateTable('users')
    .parameterize<Params>(({ qb, param }) =>
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

  const parameterization = db
    .updateTable('users')
    .parameterize<Params>(({ qb, param }) =>
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

ignore('disallows incompatible set parameter types', () => {
  interface InvalidParams {
    handleParam: number;
    nameParam: string | null;
  }

  db.updateTable('users').parameterize<InvalidParams>(({ qb, param }) =>
    //@ts-expect-error - invalid parameter type
    qb.set({
      handle: param('handleParam'),
      name: 'John Smith',
    })
  );

  db.updateTable('users').parameterize<InvalidParams>(({ qb, param }) =>
    qb.set({
      handle: 'jsmith',
      //@ts-expect-error - invalid parameter type
      name: param('nameParam'),
    })
  );
});

ignore('restricts a set generated column parameter', async () => {
  interface InvalidParams {
    idParam?: string;
  }

  db.insertInto('users').parameterize<InvalidParams>(({ qb, param }) =>
    //@ts-expect-error - invalid parameter type
    qb.values({
      id: param('idParam'),
      name: 'John Smith',
      handle: 'jsmith',
    })
  );
});

ignore('array parameters are not allowed', () => {
  interface InvalidParams {
    birthYearsParam: number[];
  }
  db.updateTable('users')
    // @ts-expect-error - invalid parameter type
    .parameterize<InvalidParams>(({ qb, param }) =>
      qb
        .set({ nickname: 'newNickname' })
        .where('birthYear', 'in', param('birthYearsParam'))
    );
});

ignore('disallows incompatible parameter types', () => {
  interface InvalidParams {
    handleParam: number;
  }
  db.updateTable('users').parameterize<InvalidParams>(({ qb, param }) =>
    qb
      .set({ nickname: 'newNickname' })
      //@ts-expect-error - invalid parameter type
      .where('handle', '=', param('handleParam'))
  );
});

ignore('restricts provided parameters', async () => {
  interface ValidParams {
    handleParam: string;
    birthYearParam: number;
  }

  const parameterization = db
    .updateTable('users')
    .parameterize<ValidParams>(({ qb, param }) =>
      qb
        .set({ nickname: 'newNickname' })
        .where('handle', '=', param('handleParam'))
        .where('name', '=', 'John Smith')
        .where('birthYear', '=', param('birthYearParam'))
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
  });
  await parameterization.executeTakeFirst(db, {
    //@ts-expect-error - invalid parameter type
    handleParam: null,
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
