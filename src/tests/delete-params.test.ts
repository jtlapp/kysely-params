import { Kysely } from 'kysely';

import { createDB, resetDB, destroyDB } from '../utils/test-setup';
import { Database } from '../utils/test-tables';
import { ignore } from '../utils/test-utils';
import '../lib/delete-params';

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

it('parameterizes deletions, with multiple executions', async () => {
  interface Params {
    nicknameParam: string;
    birthYearParam: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  // First execution

  const parameterization = db
    .deleteFrom('users')
    .parameterize<Params>(({ qb, param }) =>
      qb
        .where('nickname', '=', param('nicknameParam'))
        .where('birthYear', '=', param('birthYearParam'))
    );
  const result1 = await parameterization.execute(db, {
    nicknameParam: user2.nickname,
    birthYearParam: user2.birthYear,
  });
  expect(Number(result1?.numAffectedRows)).toEqual(1);

  // Second execution

  const result2 = await parameterization.execute(db, {
    nicknameParam: user3.nickname,
    birthYearParam: user3.birthYear,
  });
  expect(Number(result2?.numAffectedRows)).toEqual(1);

  // Verify that the correct rows were deleted

  const results = await db.selectFrom('users').selectAll().execute();
  expect(results).toEqual([{ ...user1, id: 1 }]);
});

it('parameterizes deletions using "in" operator', async () => {
  interface Params {
    nicknameParam: string;
    birthYearParam1: number;
    birthYearParam2: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = db
    .deleteFrom('users')
    .parameterize<Params>(({ qb, param }) =>
      qb
        .where('nickname', '=', param('nicknameParam'))
        .where('birthYear', 'in', [
          param('birthYearParam1'),
          param('birthYearParam2'),
        ])
    );
  const results = await parameterization.execute(db, {
    nicknameParam: user2.nickname,
    birthYearParam1: 1980,
    birthYearParam2: 1990,
  });
  expect(Number(results?.numAffectedRows)).toEqual(2);

  const users = await db.selectFrom('users').selectAll().execute();
  expect(users).toEqual([{ ...user3, id: 3 }]);
});

it('parameterizes without defined parameters', async () => {
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = db
    .deleteFrom('users')
    .parameterize(({ qb }) => qb.where('birthYear', '=', 1990));
  const results = await parameterization.execute(db, {});
  expect(Number(results?.numAffectedRows)).toEqual(2);

  const users = await db.selectFrom('users').selectAll().execute();
  expect(users).toEqual([{ ...user1, id: 1 }]);
});

ignore('array parameters are not allowed', () => {
  interface InvalidParams {
    birthYearsParam: number[];
  }
  db.deleteFrom('users')
    // @ts-expect-error - invalid parameter type
    .parameterize<InvalidParams>(({ qb, param }) =>
      qb.where('birthYear', 'in', param('birthYearsParam'))
    );
});

ignore('disallows incompatible parameter types', () => {
  interface InvalidParams {
    handleParam: number;
  }
  db.deleteFrom('users').parameterize<InvalidParams>(({ qb, param }) =>
    //@ts-expect-error - invalid parameter type
    qb.where('handle', '=', param('handleParam'))
  );
});

ignore('restricts provided parameters', async () => {
  interface ValidParams {
    handleParam: string;
    birthYearParam: number;
  }

  const parameterization = db
    .deleteFrom('users')
    .parameterize<ValidParams>(({ qb, param }) =>
      qb
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
  //@ts-expect-error - missing parameter name
  await parameterization.execute(db, {});
  //@ts-expect-error - missing parameter name
  await parameterization.executeTakeFirst(db, {});
});
