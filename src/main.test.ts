import { Kysely } from 'kysely';

import './main';
import { createDB, resetDB, destroyDB } from './utils/test-setup';
import { Database } from './utils/test-tables';

let db: Kysely<Database>;

beforeAll(async () => {
  db = await createDB();
});
beforeEach(() => resetDB(db));
afterAll(() => destroyDB(db));

it('parameterizes insert queries', async () => {
  const user = {
    handle: 'jsmith',
    name: 'John Smith',
    email: 'jsmith@abc.def',
  };
  const parameterized = db
    .insertInto('users')
    .parameterize<{ handleParam: string }>(({ qb, p }) =>
      qb
        .values({
          handle: p.param('handleParam'),
          name: 'John Smith',
          email: 'jsmith@abc.def',
        })
        .returning('id')
    );
  const result = await parameterized.executeTakeFirst(db, {
    handleParam: 'js',
  });
  expect(result).toEqual({ id: 1 });

  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', 'js')
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, handle: 'js', id: 1 });
});
