/**
 * Module enabling upates to be parameterized. Parameters cannot take
 * array values because Kysely must compile queries for the size of the array
 * The elements of a fixed-length array can be parameterized, however.
 */

import { Compilable, UpdateQueryBuilder } from 'kysely';

import { QueryParameterizer, ParameterizedQuery } from './parameterizer';
import { NoArraysObject } from './internal-types';

/**
 * Factory function for creating a parameterized `UpdateQueryBuilder`.
 */
export interface ParameterizedUpdateFactory<
  DB,
  UT extends keyof DB,
  TB extends keyof DB,
  O,
  P extends NoArraysObject<P>
> {
  (args: {
    qb: UpdateQueryBuilder<DB, UT, TB, O>;
    param: QueryParameterizer<P>['param'];
  }): Compilable<O>;
}

/**
 * Adds a `parameterize` method to `UpdateQueryBuilder`.
 */
UpdateQueryBuilder.prototype.parameterize = function <
  DB,
  UT extends keyof DB,
  TB extends keyof DB,
  O,
  P extends NoArraysObject<P>
>(
  factory: ParameterizedUpdateFactory<DB, UT, TB, O, P>
): ParameterizedQuery<P, O> {
  const parameterizer = new QueryParameterizer<P>();
  return new ParameterizedQuery(
    factory({ qb: this, param: parameterizer.param.bind(parameterizer) })
  );
};
