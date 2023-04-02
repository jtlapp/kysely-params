/**
 * Module providing types common across parameterized queries.
 */

import { CompiledQuery, Compilable, Kysely, QueryResult } from 'kysely';

/**
 * Class representing a parameterized argument.
 * @paramtype P Record characterizing the parameter names and types.
 */
class ParamArg<P extends Record<string, any>> {
  constructor(readonly name: keyof P & string) {}
}

/**
 * Class for parameterizing queries.
 * @paramtype P Record characterizing the available parameter names and types.
 */
export class QueryParameterizer<P> {
  /**
   * Returns a parameterized argument.
   * @param name Parameter name.
   * @returns Parameter having the given name and the type assigned to that
   *  name in P.
   */
  param<N extends keyof P & string>(name: N): P[N] {
    return new ParamArg(name) as unknown as P[N];
  }
}

/**
 * Class representing a parameterized query.
 */
export class ParameterizedQuery<P extends Record<string, any>, O> {
  readonly #qb: Compilable<O>;
  #compiledQuery?: CompiledQuery<O>;

  constructor(qb: Compilable<O>) {
    this.#qb = qb;
  }

  /**
   * Executes the query, returning all results.
   * @param db The Kysely database instance.
   * @param params Query parameter values.
   * @returns Query result.
   */
  async execute<DB>(db: Kysely<DB>, params: P): Promise<QueryResult<O>> {
    if (this.#compiledQuery === undefined) {
      this.#compiledQuery = this.#qb.compile();
    }
    return db.executeQuery({
      query: this.#compiledQuery.query,
      sql: this.#compiledQuery.sql,
      parameters: this.#compiledQuery.parameters.map((arg) =>
        arg instanceof ParamArg ? params[arg.name] : arg
      ),
    });
  }

  /**
   * Executes the query, returning the first result.
   * @param db The Kysely database instance.
   * @param params Query parameter values.
   * @returns First query result, or undefined if there are no results.
   */
  async executeTakeFirst<DB>(
    db: Kysely<DB>,
    params: P
  ): Promise<O | undefined> {
    const result = await this.execute(db, params);
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }
}
