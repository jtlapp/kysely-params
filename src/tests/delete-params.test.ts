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

it('instantiates deletions, with multiple executions', async () => {
  interface Params {
    targetNickname: string;
    targetBirthYear: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = db
    .deleteFrom('users')
    .parameterize<Params>(({ qb, param }) =>
      qb
        .where('nickname', '=', param('targetNickname'))
        .where('birthYear', '=', param('targetBirthYear'))
    );

  // First execution

  const compiledQuery1 = parameterization.instantiate({
    targetNickname: user2.nickname,
    targetBirthYear: user2.birthYear,
  });
  const result1 = await db.executeQuery(compiledQuery1);
  expect(Number(result1?.numAffectedRows)).toEqual(1);

  // Second execution

  const compiledQuery2 = parameterization.instantiate({
    targetNickname: user3.nickname,
    targetBirthYear: user3.birthYear,
  });
  const result2 = await db.executeQuery(compiledQuery2);
  expect(Number(result2?.numAffectedRows)).toEqual(1);

  // Verify that the correct rows were deleted

  const results = await db.selectFrom('users').selectAll().execute();
  expect(results).toEqual([{ ...user1, id: 1 }]);
});

it('parameterizes deletions, with multiple executions', async () => {
  interface Params {
    targetNickname: string;
    targetBirthYear: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  // First execution

  const parameterization = db
    .deleteFrom('users')
    .parameterize<Params>(({ qb, param }) =>
      qb
        .where('nickname', '=', param('targetNickname'))
        .where('birthYear', '=', param('targetBirthYear'))
    );
  const result1 = await parameterization.execute(db, {
    targetNickname: user2.nickname,
    targetBirthYear: user2.birthYear,
  });
  expect(Number(result1?.numAffectedRows)).toEqual(1);

  // Second execution

  const result2 = await parameterization.execute(db, {
    targetNickname: user3.nickname,
    targetBirthYear: user3.birthYear,
  });
  expect(Number(result2?.numAffectedRows)).toEqual(1);

  // Verify that the correct rows were deleted

  const results = await db.selectFrom('users').selectAll().execute();
  expect(results).toEqual([{ ...user1, id: 1 }]);
});

it('parameterizes deletions using "in" operator', async () => {
  interface Params {
    targetNickname: string;
    targetBirthYear1: number;
    targetBirthYear2: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = db
    .deleteFrom('users')
    .parameterize<Params>(({ qb, param }) =>
      qb
        .where('nickname', '=', param('targetNickname'))
        .where('birthYear', 'in', [
          param('targetBirthYear1'),
          param('targetBirthYear2'),
        ])
    );
  const results = await parameterization.execute(db, {
    targetNickname: user2.nickname,
    targetBirthYear1: 1980,
    targetBirthYear2: 1990,
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
    targetBirthYears: number[];
  }
  db.deleteFrom('users')
    // @ts-expect-error - invalid parameter type
    .parameterize<InvalidParams>(({ qb, param }) =>
      qb.where('birthYear', 'in', param('targetBirthYears'))
    );
});

ignore('disallows incompatible parameter types', () => {
  interface InvalidParams {
    targetHandle: number;
  }
  db.deleteFrom('users').parameterize<InvalidParams>(({ qb, param }) =>
    //@ts-expect-error - invalid parameter type
    qb.where('handle', '=', param('targetHandle'))
  );
});

ignore('restricts provided parameters', async () => {
  interface ValidParams {
    targetHandle: string;
    targetBirthYear: number;
  }

  const parameterization = db
    .deleteFrom('users')
    .parameterize<ValidParams>(({ qb, param }) =>
      qb
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
