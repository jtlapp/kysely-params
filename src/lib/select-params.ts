/**
 * Module enabling selections to be parameterized. Parameters cannot take null
 * values because null checks requires special SQL syntax. Parameters also
 * cannot take array values because Kysely must compile queries for the size
 * of the array, but you can parameterize the elements of an array.
 */

import { Compilable, SelectQueryBuilder } from 'kysely';

import { QueryParameterizer, ParameterizedQuery } from './parameterizer';
import { NonEmptyNoArraysObject } from './internal-types';

/**
 * Adds a `parameterize` method to `SelectQueryBuilder`.
 */
declare module 'kysely/dist/cjs/query-builder/select-query-builder' {
  interface SelectQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NonEmptyNoArraysObject<P>>(
      factory: ParameterizedSelectFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}
SelectQueryBuilder.prototype.parameterize = function <
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
 * Factory function for creating a parameterized `SelectQueryBuilder`.
 */
interface ParameterizedSelectFactory<
  DB,
  TB extends keyof DB,
  O,
  P extends NonEmptyNoArraysObject<P>
> {
  (args: {
    qb: SelectQueryBuilder<DB, TB, O>;
    p: QueryParameterizer<P>;
  }): Compilable<O>;
}
