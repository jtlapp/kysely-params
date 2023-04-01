import {
  CompiledQuery,
  Compilable,
  Kysely,
  QueryResult,
  InsertQueryBuilder,
} from 'kysely';

declare module 'kysely/dist/cjs/query-builder/insert-query-builder' {
  interface InsertQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P extends Record<string, any>>(
      factory: ParameterizedInsertFactory<DB, TB, O, P>
    ): ParameterizedQuery<P, O>;
  }
}
InsertQueryBuilder.prototype.parameterize = function <
  DB,
  TB extends keyof DB,
  O,
  P extends Record<string, any>
>(factory: ParameterizedInsertFactory<DB, TB, O, P>): ParameterizedQuery<P, O> {
  return new ParameterizedQuery(
    factory({ qb: this, p: new QueryParameterizer<P>() })
  );
};

interface ParameterizedInsertFactory<
  DB,
  TB extends keyof DB,
  O,
  P extends Record<string, any>
> {
  (args: {
    qb: InsertQueryBuilder<DB, TB, O>;
    p: QueryParameterizer<P>;
  }): Compilable<O>;
}

class ParamArg<P extends Record<string, any>> {
  constructor(readonly name: keyof P & string) {}
}

// TODO: make this a separate function if class not needed for insert values
class QueryParameterizer<P> {
  param<T>(name: keyof P & string): T {
    return new ParamArg(name) as unknown as T;
  }
}

class ParameterizedQuery<P extends Record<string, any>, O> {
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
