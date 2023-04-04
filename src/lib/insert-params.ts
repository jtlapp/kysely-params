/**
 * Module enabling insertions to be parameterized.
 */

import { Compilable, InsertQueryBuilder } from 'kysely';

import { QueryParameterizer } from './parameterizer';
import { ParameterizedQuery } from './parameterization';
import { ParametersObject } from './parameterization';

/**
 * Factory function for creating a parameterized `InsertQueryBuilder`.
 */
export interface ParameterizedInsertFactory<
  DB,
  TB extends keyof DB,
  O,
  P extends ParametersObject<P>
> {
  (args: {
    qb: InsertQueryBuilder<DB, TB, O>;
    param: QueryParameterizer<P>['param'];
  }): Compilable<O>;
}

/**
 * Adds a `parameterize` method to `InsertQueryBuilder`.
 */
InsertQueryBuilder.prototype.parameterize = function <
  DB,
  TB extends keyof DB,
  O,
  P extends ParametersObject<P>
>(factory: ParameterizedInsertFactory<DB, TB, O, P>): ParameterizedQuery<P, O> {
  const parameterizer = new QueryParameterizer<P>();
  return new ParameterizedQuery(
    factory({ qb: this, param: parameterizer.param.bind(parameterizer) })
  );
};
