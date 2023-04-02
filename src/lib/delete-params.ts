/**
 * Module enabling deletions to be parameterized. Parameters cannot take
 * array values because Kysely must compile queries for the size of the array
 * The elements of a fixed-length array can be parameterized, however.
 */

import { Compilable, DeleteQueryBuilder } from 'kysely';

import { QueryParameterizer, ParameterizedQuery } from './parameterizer';
import { NoArraysObject } from './internal-types';

/**
 * Adds a `parameterize` method to `DeleteQueryBuilder`.
 */
declare module 'kysely/dist/cjs/query-builder/delete-query-builder' {
  interface DeleteQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NoArraysObject<P>>(
      factory: ParameterizedSelectFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}
DeleteQueryBuilder.prototype.parameterize = function <
  DB,
  TB extends keyof DB,
  O,
  P extends NoArraysObject<P>
>(factory: ParameterizedSelectFactory<DB, TB, O, P>): ParameterizedQuery<P, O> {
  const parameterizer = new QueryParameterizer<P>();
  return new ParameterizedQuery(
    factory({ qb: this, param: parameterizer.param.bind(parameterizer) })
  );
};

/**
 * Factory function for creating a parameterized `DeleteQueryBuilder`.
 */
interface ParameterizedSelectFactory<
  DB,
  TB extends keyof DB,
  O,
  P extends NoArraysObject<P>
> {
  (args: {
    qb: DeleteQueryBuilder<DB, TB, O>;
    param: QueryParameterizer<P>['param'];
  }): Compilable<O>;
}
