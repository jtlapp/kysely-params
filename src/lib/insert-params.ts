/**
 * Module enabling insertions to be parameterized.
 */

import { Compilable, InsertQueryBuilder } from 'kysely';

import { QueryParameterizer, ParameterizedQuery } from './parameterizer';
import { NonEmptyNoArraysObject } from './internal-types';

/**
 * Adds a `parameterize` method to `InsertQueryBuilder`.
 */
declare module 'kysely/dist/cjs/query-builder/insert-query-builder' {
  interface InsertQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NonEmptyNoArraysObject<P>>(
      factory: ParameterizedInsertFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}
InsertQueryBuilder.prototype.parameterize = function <
  DB,
  TB extends keyof DB,
  O,
  P extends NonEmptyNoArraysObject<P>
>(factory: ParameterizedInsertFactory<DB, TB, O, P>): ParameterizedQuery<P, O> {
  const parameterizer = new QueryParameterizer<P>();
  return new ParameterizedQuery(
    factory({ qb: this, param: parameterizer.param.bind(parameterizer) })
  );
};

/**
 * Factory function for creating a parameterized `InsertQueryBuilder`.
 */
interface ParameterizedInsertFactory<
  DB,
  TB extends keyof DB,
  O,
  P extends NonEmptyNoArraysObject<P>
> {
  (args: {
    qb: InsertQueryBuilder<DB, TB, O>;
    param: QueryParameterizer<P>['param'];
  }): Compilable<O>;
}
