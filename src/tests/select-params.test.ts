import { Kysely, sql } from 'kysely';

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
  // leave out nickname
  handle: 'jdoe',
  birthYear: 1990,
};

it('instantiates "where" selections, with multiple executions', async () => {
  interface Params {
    targetNickname: string;
    targetBirthYear: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = parameterizeQuery(
    db.selectFrom('users').selectAll()
  ).asFollows<Params>(({ qb, param }) =>
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
  expect(result1?.rows).toEqual([{ ...user2, id: 2 }]);

  // Second execution

  const compiledQuery2 = parameterization.instantiate({
    targetNickname: user2.nickname,
    targetBirthYear: 1980,
  });
  const result2 = await db.executeQuery(compiledQuery2);
  expect(result2?.rows).toEqual([{ ...user1, id: 1 }]);
});

it('parameterizes "where" selections, with multiple executions', async () => {
  interface Params {
    targetNickname: string;
    targetBirthYear: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  // First execution

  const parameterization = parameterizeQuery(
    db.selectFrom('users').selectAll()
  ).asFollows<Params>(({ qb, param }) =>
    qb
      .where('nickname', '=', param('targetNickname'))
      .where('birthYear', '=', param('targetBirthYear'))
  );
  const result1 = await parameterization.executeTakeFirst(db, {
    targetNickname: user2.nickname,
    targetBirthYear: user2.birthYear,
  });
  expect(result1).toEqual({ ...user2, id: 2 });
  // Make sure we can address properties by name.
  expect(result1?.name).toEqual(user2.name);

  // Second execution

  const result2 = await parameterization.executeTakeFirst(db, {
    targetNickname: user2.nickname,
    targetBirthYear: 1980,
  });
  expect(result2).toEqual({ ...user1, id: 1 });
});

it('parameterizes "where" selections for specific columns', async () => {
  interface Params {
    targetHandle: string;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = parameterizeQuery(
    db.selectFrom('users').select('name')
  ).asFollows<Params>(({ qb, param }) =>
    qb.where('handle', '=', param('targetHandle'))
  );
  const result1 = await parameterization.executeTakeFirst(db, {
    targetHandle: user3.handle,
  });
  expect(result1).toEqual({ name: user3.name });
});

it('parameterizes "where" selections using "in" operator', async () => {
  interface Params {
    targetNickname: string;
    targetBirthYear1: number;
    targetBirthYear2: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = parameterizeQuery(
    db.selectFrom('users').selectAll()
  ).asFollows<Params>(({ qb, param }) =>
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
  expect(results.rows).toEqual([
    { ...user1, id: 1 },
    { ...user2, id: 2 },
  ]);
  // Make sure we can address properties by name.
  expect(results.rows[0].name).toEqual(user1.name);
});

it('parameterizes values within a where expression', async () => {
  interface Params {
    targetNickname: string;
    targetBirthYear1: number;
    targetBirthYear2: number;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = parameterizeQuery(
    db.selectFrom('users').selectAll()
  ).asFollows<Params>(({ qb, param }) =>
    qb.where(({ and, cmpr }) =>
      and([
        cmpr('nickname', '=', param('targetNickname')),
        cmpr('birthYear', 'in', [
          param('targetBirthYear1'),
          param('targetBirthYear2'),
        ]),
      ])
    )
  );
  const results = await parameterization.execute(db, {
    targetNickname: user2.nickname,
    targetBirthYear1: 1980,
    targetBirthYear2: 1990,
  });
  expect(results.rows).toEqual([
    { ...user1, id: 1 },
    { ...user2, id: 2 },
  ]);
});

it('parameterizes values within a SQL expression', async () => {
  interface Params {
    targetName: string;
  }
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = parameterizeQuery(
    db.selectFrom('users').selectAll()
  ).asFollows<Params>(({ qb, param }) =>
    qb.where(sql`name = ${param('targetName')}`)
  );

  // First execution

  const results1 = await parameterization.execute(db, {
    targetName: user1.name,
  });
  expect(results1.rows).toEqual([{ ...user1, id: 1 }]);

  // Second execution

  const results2 = await parameterization.execute(db, {
    targetName: user2.name,
  });
  expect(results2.rows).toEqual([{ ...user2, id: 2 }]);
});

it('parameterizes without defined parameters', async () => {
  await db.insertInto('users').values([user1, user2, user3]).execute();

  const parameterization = parameterizeQuery(
    db.selectFrom('users').selectAll()
  ).asFollows(({ qb }) =>
    qb
      .where('nickname', '=', user2.nickname)
      .where('birthYear', '=', user1.birthYear)
  );
  const result2 = await parameterization.executeTakeFirst(db, {});
  expect(result2).toEqual({ ...user1, id: 1 });
});

ignore('array parameters are not allowed', () => {
  interface InvalidParams {
    targetBirthYears: number[];
  }
  parameterizeQuery(
    db.selectFrom('users').selectAll()
    // @ts-expect-error - invalid parameter type
  ).asFollows<InvalidParams>(({ qb, param }) =>
    qb.where('birthYear', 'in', param('targetBirthYears'))
  );
});

ignore('disallows incompatible parameter types', () => {
  interface InvalidParams {
    targetHandle: number;
  }
  parameterizeQuery(db.selectFrom('users')).asFollows<InvalidParams>(
    ({ qb, param }) =>
      //@ts-expect-error - invalid parameter type
      qb.where('handle', '=', param('targetHandle'))
  );
  parameterizeQuery(db.selectFrom('users')).asFollows<InvalidParams>(
    ({ qb, param }) =>
      qb.where(({ or, cmpr }) =>
        //@ts-expect-error - invalid parameter type
        or([cmpr('handle', '=', param('targetHandle'))])
      )
  );
});

ignore('disallows parameters in column positions', () => {
  interface ValidParams {
    targetHandle: string;
  }

  parameterizeQuery(db.selectFrom('users')).asFollows<ValidParams>(
    ({ qb, param }) =>
      // @ts-expect-error - invalid parameter position
      qb.where(param('targetHandle'), '=', 'jsmith')
  );

  parameterizeQuery(db.selectFrom('users')).asFollows<ValidParams>(
    ({ qb, param }) =>
      qb.where(({ or, cmpr }) =>
        or([
          // @ts-expect-error - invalid parameter position
          cmpr(param('targetHandle'), '=', 'jsmith'),
          // @ts-expect-error - invalid parameter position
          cmpr('birthYear', param('targetHandle'), 1980),
        ])
      )
  );
});

ignore('restricts provided parameters', async () => {
  interface ValidParams {
    targetHandle: string;
    targetBirthYear: number;
  }

  const parameterization = parameterizeQuery(
    db.selectFrom('users')
  ).asFollows<ValidParams>(({ qb, param }) =>
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
