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
    .parameterize<{ handle: string }>(({ qb, strValue, strParam }) =>
      qb.values({
        handle: strParam('handle'),
        name: strValue('John Smith'),
        email: strValue('jsmith@abc.def'),
      })
    );
  await parameterized.execute(db, { handle: 'js' });

  const readUser = await db
    .selectFrom('users')
    .selectAll()
    .where('handle', '=', 'js')
    .executeTakeFirst();
  expect(readUser).toEqual({ ...user, handle: 'js', id: 1 });
});
