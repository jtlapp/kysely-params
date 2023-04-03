export * from './lib/parameterizer';
export * from './lib/delete-params';
export * from './lib/insert-params';
export * from './lib/select-params';
export * from './lib/update-params';

// Extensions of Kysely's query builders

import { ParameterizedQuery } from './lib/parameterizer';
import { ParameterizedDeleteFactory } from './lib/delete-params';
import { ParameterizedInsertFactory } from './lib/insert-params';
import { ParameterizedSelectFactory } from './lib/select-params';
import { ParameterizedUpdateFactory } from './lib/update-params';
import { NoArraysObject } from './lib/internal-types';

declare module 'kysely/dist/cjs/query-builder/delete-query-builder' {
  export interface DeleteQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NoArraysObject<P>>(
      factory: ParameterizedDeleteFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}

declare module 'kysely/dist/cjs/query-builder/insert-query-builder' {
  export interface InsertQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NoArraysObject<P>>(
      factory: ParameterizedInsertFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}

declare module 'kysely/dist/cjs/query-builder/select-query-builder' {
  export interface SelectQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends NoArraysObject<P>>(
      factory: ParameterizedSelectFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}

declare module 'kysely/dist/cjs/query-builder/update-query-builder' {
  export interface UpdateQueryBuilder<
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
