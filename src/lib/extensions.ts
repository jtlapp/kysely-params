/**
 * Type extensions for Kysely query builders.
 */

import { ParameterizedQuery } from './parameterizer';
import { NoArraysObject } from './internal-types';
import { ParameterizedDeleteFactory } from './delete-params';
import { ParameterizedInsertFactory } from './insert-params';
import { ParameterizedSelectFactory } from './select-params';
import { ParameterizedUpdateFactory } from './update-params';

declare module 'kysely/dist/cjs/query-builder/delete-query-builder' {
  interface DeleteQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NoArraysObject<P>>(
      factory: ParameterizedDeleteFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}

declare module 'kysely/dist/cjs/query-builder/insert-query-builder' {
  interface InsertQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NoArraysObject<P>>(
      factory: ParameterizedInsertFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}

declare module 'kysely/dist/cjs/query-builder/select-query-builder' {
  interface SelectQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NoArraysObject<P>>(
      factory: ParameterizedSelectFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}

declare module 'kysely/dist/cjs/query-builder/update-query-builder' {
  interface UpdateQueryBuilder<
    DB,
    UT extends keyof DB,
    TB extends keyof DB,
    O
  > {
    parameterize<P extends NoArraysObject<P>>(
      factory: ParameterizedUpdateFactory<DB, UT, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}

export {};
