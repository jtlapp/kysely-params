import { Kysely } from 'kysely';

import { createDB, resetDB, destroyDB } from '../utils/test-setup';
import { Database } from '../utils/test-tables';
import '../lib/select-params';
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
  // leave out nickname
  handle: 'jdoe',
  birthYear: 1990,
};

it('parameterizes "where" selections, with multiple executions', async () => {
  interface Params {
    nicknameParam: string;
    birthYearParam: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  // First execution

  const parameterization = db
    .selectFrom('users')
    .selectAll()
    .parameterize<Params>(({ qb, p }) =>
      qb
        .where('nickname', '=', p.param('nicknameParam'))
        .where('birthYear', '=', p.param('birthYearParam'))
    );
  const result1 = await parameterization.executeTakeFirst(db, {
    nicknameParam: user2.nickname,
    birthYearParam: user2.birthYear,
  });
  expect(result1).toEqual({ ...user2, id: 2 });

  // Second execution

  const result2 = await parameterization.executeTakeFirst(db, {
    nicknameParam: user2.nickname,
    birthYearParam: 1980,
  });
  expect(result2).toEqual({ ...user1, id: 1 });
});

it('parameterizes "where" selections for specific columns', async () => {
  interface Params {
    handleParam: string;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = db
    .selectFrom('users')
    .select('name')
    .parameterize<Params>(({ qb, p }) =>
      qb.where('handle', '=', p.param('handleParam'))
    );
  const result1 = await parameterization.executeTakeFirst(db, {
    handleParam: user3.handle,
  });
  expect(result1).toEqual({ name: user3.name });
});

it('parameterizes "where" selections using "in" operator', async () => {
  interface Params {
    nicknameParam: string;
    birthYearParam1: number;
    birthYearParam2: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = db
    .selectFrom('users')
    .selectAll()
    .parameterize<Params>(({ qb, p }) =>
      qb
        .where('nickname', '=', p.param('nicknameParam'))
        .where('birthYear', 'in', [
          p.param('birthYearParam1'),
          p.param('birthYearParam2'),
        ])
    );
  const results = await parameterization.execute(db, {
    nicknameParam: user2.nickname,
    birthYearParam1: 1980,
    birthYearParam2: 1990,
  });
  expect(results.rows).toEqual([
    { ...user1, id: 1 },
    { ...user2, id: 2 },
  ]);
});

ignore('array parameters are not allowed', () => {
  interface InvalidParams {
    birthYearsParam: number[];
  }
  db.selectFrom('users')
    .selectAll()
    // @ts-expect-error - invalid parameter type
    .parameterize<InvalidParams>(({ qb, p }) =>
      qb.where('birthYear', 'in', p.param('birthYearsParam'))
    );
});

ignore('disallows incompatible parameter types', () => {
  interface InvalidParams {
    handleParam: number;
  }
  db.selectFrom('users').parameterize<InvalidParams>(({ qb, p }) =>
    //@ts-expect-error - invalid parameter type
    qb.where('handle', '=', p.param('handleParam'))
  );
});

ignore('restricts provided parameters', async () => {
  interface ValidParams {
    handleParam: string;
    birthYearParam: number;
  }

  const parameterization = db
    .selectFrom('users')
    .parameterize<ValidParams>(({ qb, p }) =>
      qb
        .where('handle', '=', p.param('handleParam'))
        .where('name', '=', 'John Smith')
        .where('birthYear', '=', p.param('birthYearParam'))
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
