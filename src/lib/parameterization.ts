import { CompiledQuery, Compilable, Kysely, QueryResult } from 'kysely';

import { ParamArg } from './parameterizer';

/**
 * Type for an object that defines the query parameters. It disallows the
 * object from having array properties.
 * @typeparam T Type that is to define the query parameters.
 */
export type ParametersObject<P> = {
  [K in keyof P]: P[K] extends Array<any> ? never : P[K];
};

/**
 * Class representing a parameterized compiled query that can be repeatedly
 * executed or instantiated with different values for its parameters.
 * @paramtype P Record characterizing the parameter names and types.
 */
export class ParameterizedQuery<P extends ParametersObject<P>, O> {
  #qb: Compilable<O> | null;
  #compiledQuery?: CompiledQuery<O>;

  constructor(qb: Compilable<O>) {
    this.#qb = qb;
  }

  /**
   * Executes the query with all parameters replaced, returning all results.
   * Compiles the query on the first call, caching the compiled query and
   * discarding the underlying query builder to reduce memory used.
   * @param db The Kysely database instance.
   * @param params Object providing values for all parameters.
   * @returns Query result.
   */
  execute<DB>(db: Kysely<DB>, params: P): Promise<QueryResult<O>> {
    return db.executeQuery(this.instantiate(params));
  }

  /**
   * Executes the query with all parameters replaced, returning the first
   * result. Compiles the query on the first call, caching the compiled query
   * and discarding the underlying query builder to reduce memory used.
   * @param db The Kysely database instance.
   * @param params Object providing values for all parameters.
   * @returns First query result, or undefined if there are no results.
   */
  async executeTakeFirst<DB>(
    db: Kysely<DB>,
    params: P
  ): Promise<O | undefined> {
    const result = await db.executeQuery(this.instantiate(params));
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }

  /**
   * Instantiates the query as a compiled query with all parameters replaced,
   * returning the compiled query. Compiles the query on the first call,
   * caching the uninstantiated compiled query and discarding the underlying
   * query builder to reduce memory used.
   * @param params Object providing values for all parameters.
   * @returns Compiled query with values replacing all parameters.
   */
  instantiate(params: P): CompiledQuery<O> {
    if (this.#compiledQuery === undefined) {
      this.#compiledQuery = this.#qb!.compile();
      // Allow the query builder to be garbage collected.
      this.#qb = null;
    }
    return {
      query: this.#compiledQuery.query,
      sql: this.#compiledQuery.sql,
      parameters: this.#compiledQuery.parameters.map((arg) =>
        arg instanceof ParamArg ? params[arg.name as keyof P] : arg
      ),
    };
  }
}
