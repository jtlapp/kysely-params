import { CompiledQuery, Compilable, Kysely, QueryResult } from 'kysely';

class ParamArg<P extends Record<string, any>> {
  constructor(readonly name: keyof P & string) {}
}

export class QueryParameterizer<P> {
  param<T>(name: keyof P & string): T {
    return new ParamArg(name) as unknown as T;
  }
}

export class ParameterizedQuery<P extends Record<string, any>, O> {
  readonly #qb: Compilable<O>;
  #compiledQuery?: CompiledQuery;

  constructor(qb: Compilable<O>) {
    this.#qb = qb;
  }

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

  async executeTakeFirst<DB>(
    db: Kysely<DB>,
    params: P
  ): Promise<O | undefined> {
    const result = await this.execute(db, params);
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }
}
