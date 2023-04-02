/**
 * Module enabling deletions to be parameterized. Parameters cannot take
 * array values because Kysely must compile queries for the size of the array
 * The elements of a fixed-length array can be parameterized, however.
 */

import { Compilable, DeleteQueryBuilder } from 'kysely';

import { QueryParameterizer, ParameterizedQuery } from './parameterizer';
import { NonEmptyNoArraysObject } from './internal-types';

/**
 * Adds a `parameterize` method to `DeleteQueryBuilder`.
 */
declare module 'kysely/dist/cjs/query-builder/delete-query-builder' {
  interface DeleteQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NonEmptyNoArraysObject<P>>(
      factory: ParameterizedSelectFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}
DeleteQueryBuilder.prototype.parameterize = function <
  DB,
  TB extends keyof DB,
  O,
  P extends NonEmptyNoArraysObject<P>
>(factory: ParameterizedSelectFactory<DB, TB, O, P>): ParameterizedQuery<P, O> {
  return new ParameterizedQuery(
    factory({ qb: this, p: new QueryParameterizer<P>() })
  );
};

/**
 * Factory function for creating a parameterized `DeleteQueryBuilder`.
 */
interface ParameterizedSelectFactory<
  DB,
  TB extends keyof DB,
  O,
  P extends NonEmptyNoArraysObject<P>
> {
  (args: {
    qb: DeleteQueryBuilder<DB, TB, O>;
    p: QueryParameterizer<P>;
  }): Compilable<O>;
}
