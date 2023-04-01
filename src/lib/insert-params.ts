import { Compilable, InsertQueryBuilder } from 'kysely';

import { QueryParameterizer, ParameterizedQuery } from './parameterizer';

declare module 'kysely/dist/cjs/query-builder/insert-query-builder' {
  interface InsertQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends Record<string, any>>(
      factory: ParameterizedInsertFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}
InsertQueryBuilder.prototype.parameterize = function <
  DB,
  TB extends keyof DB,
  O,
  P extends Record<string, any>
>(factory: ParameterizedInsertFactory<DB, TB, O, P>): ParameterizedQuery<P, O> {
  return new ParameterizedQuery(
    factory({ qb: this, p: new QueryParameterizer<P>() })
  );
};

interface ParameterizedInsertFactory<
  DB,
  TB extends keyof DB,
  O,
  P extends Record<string, any>
> {
  (args: {
    qb: InsertQueryBuilder<DB, TB, O>;
    p: QueryParameterizer<P>;
  }): Compilable<O>;
}
