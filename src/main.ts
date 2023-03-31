import { CompiledQuery, InsertQueryBuilder, Kysely } from 'kysely';

const FIXED_DECIMAL_WIDTH = 8;
const ARG_FUNCTIONS = 'numValue(), strValue(), numParam(), or strParam()';

declare module 'kysely/dist/cjs/query-builder/insert-query-builder' {
  interface InsertQueryBuilder<DB, TB extends keyof DB, O> {
    parameterize<P>(
      factory: ParameterizedInsertFactory<DB, TB, O, P>
    ): ParameterizedInsert<DB, P>;
  }
}
InsertQueryBuilder.prototype.parameterize = function <
  DB,
  TB extends keyof DB,
  O,
  P
>(
  this: InsertQueryBuilder<DB, TB, O>,
  factory: ParameterizedInsertFactory<DB, TB, O, P>
) {
  return new ParameterizedInsert<DB, P>(this, factory);
};

export type ParameterizedInsertFactory<DB, TB extends keyof DB, O, P> = (args: {
  qb: InsertQueryBuilder<DB, TB, O>;
  numValue: (value: number) => number;
  strValue: (value: string) => string;
  numParam: (name: keyof P & string) => number;
  strParam: (name: keyof P & string) => string;
}) => InsertQueryBuilder<DB, TB, O>;

export class ParameterizedInsert<DB, P> {
  readonly #argList = new ArgList();
  readonly #qb: InsertQueryBuilder<any, any, any>;
  #compiledQuery?: CompiledQuery;

  constructor(
    qb: InsertQueryBuilder<any, any, any>,
    factory: ParameterizedInsertFactory<any, any, any, P>
  ) {
    this.#qb = factory({
      qb,
      numValue: this.#argList.nextNumValue.bind(this.#argList),
      strValue: this.#argList.nextStrValue.bind(this.#argList),
      numParam: this.#argList.nextNumParam.bind(this.#argList),
      strParam: this.#argList.nextStrParam.bind(this.#argList),
    });
  }

  async execute(db: Kysely<DB>, params: P) {
    if (this.#compiledQuery === undefined) {
      const compiledQuery = this.#qb.compile();
      if (compiledQuery.parameters.length !== this.#argList.size()) {
        throw Error('Query has arguments not specified via ' + ARG_FUNCTIONS);
      }
      this.#compiledQuery = {
        query: compiledQuery.query,
        sql: compiledQuery.sql,
        parameters: compiledQuery.parameters.map((codedArg, i) =>
          typeof codedArg == 'string'
            ? this.#argList.stringToIndex(codedArg, i)
            : typeof codedArg == 'number'
            ? this.#argList.numberToIndex(codedArg, i)
            : codedArg
        ),
      };
    }
    const runnable: Readonly<CompiledQuery> = {
      query: this.#compiledQuery.query,
      sql: this.#compiledQuery.sql,
      parameters: this.#compiledQuery.parameters.map((arg) =>
        typeof arg == 'number' ? this.#argList.toQueryArg(params, arg) : arg
      ),
    };
    return db.executeQuery(runnable);
  }
}

class ParamArg {
  constructor(readonly name: string) {}
}

class ArgList {
  #numericTag = Math.random();
  #stringTag = Math.random().toFixed(FIXED_DECIMAL_WIDTH).substring(1);
  #paramCount = 0;
  #args: any[] = [];

  nextNumParam(name: string): number {
    this.#args.push(new ParamArg(name));
    return this.#nextNum();
  }

  nextNumValue(value: number): number {
    this.#args.push(value);
    return this.#nextNum();
  }

  nextStrParam(name: string): string {
    this.#args.push(new ParamArg(name));
    return this.#nextStr();
  }

  nextStrValue(value: string): string {
    this.#args.push(value);
    return this.#nextStr();
  }

  size(): number {
    return this.#args.length;
  }

  numberToIndex(placeholder: number, paramIndex: number): number {
    if ((placeholder % 1).toFixed(FIXED_DECIMAL_WIDTH) != this.#stringTag) {
      throw Error(
        `Argument at index ${paramIndex} not specified via ` + ARG_FUNCTIONS
      );
    }
    const argIndex = Math.floor(placeholder);
    const arg = this.#args[argIndex];
    if (!(arg instanceof ParamArg) && typeof arg != 'number') {
      throw Error(`Expected argument at index ${paramIndex} to be a number`);
    }
    return argIndex;
  }

  stringToIndex(placeholder: string, paramIndex: number): number {
    const periodOffset = placeholder.indexOf('.');
    if (placeholder.substring(periodOffset) != this.#stringTag) {
      throw Error(
        `Argument at index ${paramIndex} not specified via ` + ARG_FUNCTIONS
      );
    }
    const argIndex = parseInt(placeholder.substring(0, periodOffset));
    const arg = this.#args[parseInt(placeholder.substring(0, periodOffset))];
    if (!(arg instanceof ParamArg) && typeof arg != 'string') {
      throw Error(`Expected argument at index ${paramIndex} to be a string`);
    }
    return argIndex;
  }

  toQueryArg(params: any, argIndex: number): string | number {
    const arg = this.#args[argIndex];
    return arg instanceof ParamArg ? params[arg.name] : arg;
  }

  #nextNum(): number {
    return this.#paramCount++ + this.#numericTag;
  }

  #nextStr(): string {
    return this.#paramCount++ + this.#stringTag;
  }
}
