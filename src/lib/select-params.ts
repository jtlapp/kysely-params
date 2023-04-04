/**
 * Module enabling selections to be parameterized. Parameters cannot take
 * array values because Kysely must compile queries for the size of the array
 * The elements of a fixed-length array can be parameterized, however. Column
 * selections must be made prior to calling `parameterize()`.
 */

import { Compilable, SelectQueryBuilder } from 'kysely';

import { QueryParameterizer } from './parameterizer';
import { ParameterizedQuery } from './parameterization';
import { NoArraysObject } from './internal-types';

/**
 * Factory function for creating a parameterized `SelectQueryBuilder`.
 */
export interface ParameterizedSelectFactory<
  DB,
  TB extends keyof DB,
  O,
  P extends NoArraysObject<P>
> {
  (args: {
    qb: SelectQueryBuilder<DB, TB, O>;
    param: QueryParameterizer<P>['param'];
  }): Compilable<O>;
}

/**
 * Adds a `parameterize` method to `SelectQueryBuilder`.
 */
SelectQueryBuilder.prototype.parameterize = function <
  DB,
  TB extends keyof DB,
  O,
  P extends NoArraysObject<P>
>(factory: ParameterizedSelectFactory<DB, TB, O, P>): ParameterizedQuery<P, O> {
  if (!this.toOperationNode().selections) {
    throw Error("Can't parameterize query before selecting columns");
  }
  const parameterizer = new QueryParameterizer<P>();
  return new ParameterizedQuery(
    factory({ qb: this, param: parameterizer.param.bind(parameterizer) })
  );
};
