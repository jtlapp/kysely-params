/**
 * Module enabling selections to be parameterized. Parameters cannot take
 * array values because Kysely must compile queries for the size of the array
 * The elements of a fixed-length array can be parameterized, however. Column
 * selections must be made prior to calling `parameterize()`.
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
  const parameterizer = new QueryParameterizer<P>();
  return new ParameterizedQuery(
    factory({ qb: this, param: parameterizer.param.bind(parameterizer) })
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
    param: QueryParameterizer<P>['param'];
  }): Compilable<O>;
}
