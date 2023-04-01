/**
 * Module enabling insertions to be parameterized.
 */

import { Compilable, InsertQueryBuilder } from 'kysely';

import { QueryParameterizer, ParameterizedQuery } from './parameterizer';
import { NonEmptyObject } from './internal-types';

/**
 * Adds a `parameterize` method to `InsertQueryBuilder`.
 */
declare module 'kysely/dist/cjs/query-builder/insert-query-builder' {
  interface InsertQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NonEmptyObject<P>>(
      factory: ParameterizedInsertFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}
InsertQueryBuilder.prototype.parameterize = function <
  DB,
  TB extends keyof DB,
  O,
  P extends NonEmptyObject<P>
>(factory: ParameterizedInsertFactory<DB, TB, O, P>): ParameterizedQuery<P, O> {
  return new ParameterizedQuery(
    factory({ qb: this, p: new QueryParameterizer<P>() })
  );
};

/**
 * Factory function for creating a parameterized `InsertQueryBuilder`.
 */
interface ParameterizedInsertFactory<
  DB,
  TB extends keyof DB,
  O,
  P extends NonEmptyObject<P>
> {
  (args: {
    qb: InsertQueryBuilder<DB, TB, O>;
    p: QueryParameterizer<P>;
  }): Compilable<O>;
}
