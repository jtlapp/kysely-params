/**
 * Module enabling upates to be parameterized. Parameters cannot take
 * array values because Kysely must compile queries for the size of the array
 * The elements of a fixed-length array can be parameterized, however.
 */

import { Compilable, UpdateQueryBuilder } from 'kysely';

import { QueryParameterizer, ParameterizedQuery } from './parameterizer';
import { NonEmptyNoArraysObject } from './internal-types';

/**
 * Adds a `parameterize` method to `UpdateQueryBuilder`.
 */
declare module 'kysely/dist/cjs/query-builder/update-query-builder' {
  interface UpdateQueryBuilder<
    DB,
    UT extends keyof DB,
    TB extends keyof DB,
    O
  > {
    parameterize<P extends NonEmptyNoArraysObject<P>>(
      factory: ParameterizedSelectFactory<DB, UT, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}
UpdateQueryBuilder.prototype.parameterize = function <
  DB,
  UT extends keyof DB,
  TB extends keyof DB,
  O,
  P extends NonEmptyNoArraysObject<P>
>(
  factory: ParameterizedSelectFactory<DB, UT, TB, O, P>
): ParameterizedQuery<P, O> {
  return new ParameterizedQuery(
    factory({ qb: this, p: new QueryParameterizer<P>() })
  );
};

/**
 * Factory function for creating a parameterized `UpdateQueryBuilder`.
 */
interface ParameterizedSelectFactory<
  DB,
  UT extends keyof DB,
  TB extends keyof DB,
  O,
  P extends NonEmptyNoArraysObject<P>
> {
  (args: {
    qb: UpdateQueryBuilder<DB, UT, TB, O>;
    p: QueryParameterizer<P>;
  }): Compilable<O>;
}
