/**
 * Module enabling deletions to be parameterized. Parameters cannot take
 * array values because Kysely must compile queries for the size of the array
 * The elements of a fixed-length array can be parameterized, however.
 */

import { Compilable, DeleteQueryBuilder } from 'kysely';

import { QueryParameterizer } from './parameterizer';
import { ParameterizedQuery } from './parameterization';
import { ParametersObject } from './parameterization';

/**
 * Factory function for creating a parameterized `DeleteQueryBuilder`.
 */
export interface ParameterizedDeleteFactory<
  DB,
  TB extends keyof DB,
  O,
  P extends ParametersObject<P>
> {
  (args: {
    qb: DeleteQueryBuilder<DB, TB, O>;
    param: QueryParameterizer<P>['param'];
  }): Compilable<O>;
}

/**
 * Adds a `parameterize` method to `DeleteQueryBuilder`.
 */
DeleteQueryBuilder.prototype.parameterize = function <
  DB,
  TB extends keyof DB,
  O,
  P extends ParametersObject<P>
>(factory: ParameterizedDeleteFactory<DB, TB, O, P>): ParameterizedQuery<P, O> {
  const parameterizer = new QueryParameterizer<P>();
  return new ParameterizedQuery(
    factory({ qb: this, param: parameterizer.param.bind(parameterizer) })
  );
};
