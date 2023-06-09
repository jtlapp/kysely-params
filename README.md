# kysely-params

A utility for parameterizing compiled Kysely queries

## Introduction

This utility allows you to parameterize compiled [Kysely](https://github.com/kysely-org/kysely) queries. It provides a `parameterizeQuery` function that allows you to selectively parameterize inserted, updated, and compared values within a Kysely query builder. The function returns a parameterized query that can be repeatedly called to execute or instantiate the query with different values for the parameters. On its first call, the query is compiled and its compilation cached, and the sourcing query builder is discarded to free memory. Subsequent calls use the cached compilation.

The utility parameterizes values by replacing the values in the parameter list that Kysely passes to the database; values are not inserted into the query. For this reason, the utility should be as safe as providing values to Kysely directly.

## Purpose

Kysely is a highly performant query builder, and you shouldn't need this utility to improve query speed. However, Kysely does use memory, increase garbage collection, and consume clock cycles that could be used elsewhere. This utility allows you to minimize resource usage for the kinds of applications that can benefit.

Kysely's creator, Sami Koskimäki, maintains a [benchmark](https://github.com/kysely-org/kysely/blob/master/test/node/src/performance.test.ts) that tests the runtime speed of a complex query. Running the query 100,000 times on an M2 Macbook yields an average runtime of [14.6 microseconds](https://discord.com/channels/890118421587578920/1091365779376717945/1093203459454533633). Combine this with the fact that the performance bottleneck in database applications is almost always the database itself, and you can see that for most applications, the present utility is unnecessary and would provide unnecessary additional complication to use.

This utility exists to help you feel comfortable using Kysely in any application, regardless of performance requirements. Query builders necessarily create many objects, and we may be concerned about using Kysely in memory-intensive applications, in applications that involve compute-bound work, or in real-time applications with response time requirements, which garbage collection could interfere with. It is hard to know in advance of development and testing whether there will be a problem. For this reason, absent the present utility, some people may be inclined to stick with raw SQL just to be safe. The existence of the utility allows you to use Kysely, regardless of application requirements. In the unlikely case that you encounter a problem using vanilla Kysely, you can start using this utility instead of ditching Kysely.

This utility adds a bit of complication to your queries. It's best to implement the application without this utility until you find that you need it. You may discover that you never needed the additional complication.

In case you're curious, [wirekang](https://github.com/wirekang) provides [speed and memory benchmarks](https://github.com/wirekang/kysely-params-benchmarks) for the utility.

## Installation

Install both Kysely and the package with your preferred dependency manager:

```
npm install kysely kysely-params

yarn add kysely kysely-params

pnpm add kysely kysely-params
```

Then import the `parameterizeQuery` function into each file that needs to parameterize queries:

```ts
import { parameterizeQuery } from 'kysely-params';
```

## Usage

First use the utilty function to create a parameterized query. Consider the following example:

```ts
interface UserParams {
  targetNickname: string;
  targetBirthYear: number;
}

const parameterization = parameterizeQuery(
  db.selectFrom('users').selectAll()
).asFollows<UserParams>(({ qb, param }) =>
  qb
    .where('nickname', '=', param('targetNickname'))
    .where('birthYear', '=', param('targetBirthYear'))
    .where('state', '=', 'Virginia')
);
```

This produces a parameterization of the query but does not yet compile or execute the query. The example `UserParams` interface defines the available parameters and their types. `db` is an instance of [`Kysely`](https://kysely-org.github.io/kysely/classes/Kysely.html). `qb` is a regular Kysely query builder &mdash; in this case, a [`SelectQueryBuilder`](https://kysely-org.github.io/kysely/classes/SelectQueryBuilder.html). Call `param` with a parameter name where you would like to be able to vary the value.

When calling `parameterizeQuery`, you must provide a query builder that specifies all selected and returned columns (via `select()`, `selectAll()`, `returning()`, and `returningAll()`) if you wish to be able to access the returned columns by name. Otherwise, TypeScript will not be aware of the returned columns or their types.

Now execute the parameterized query. You can execute the same parameterized query as many times as you like. The `execute` and `executeTakeFirst` methods are available, as is an `instantiate` method for returning a [`CompiledQuery`](https://github.com/kysely-org/kysely/blob/master/site/docs/recipes/splitting-build-compile-and-execute-code.md#execute-compiled-queries) with all parameters replaced with values:

```ts
const result = await parameterization.executeTakeFirst(db, {
  targetNickname: 'Joey',
  targetBirthYear: 2000,
});

const results1 = await parameterization.execute(db, {
  targetNickname: 'Johnny',
  targetBirthYear: 1980,
});

const compiledQuery = parameterization.instantiate({
  targetNickname: 'Susie',
  targetBirthYear: 1990,
});
const results2 = await db.executeQuery(compiledQuery);
```

The query compiles on the first call to `execute`, `executeTakeFirst`, or `instantiate`, and the compilation is used on that and subsequent calls. The first argument is the instance of `Kysely`, and the second is an object that provides the values of the parameters.

Parameterizing a query requires having an instance of `Kysely`, but we usually don't have this instance in the place where we need to define the parameterization. We can deal with this by defining a function that takes an instance of `Kysely` and returns an object having parameterizations. Then define an instance of this object as the return type of this function:

```ts
class MyRepo {
  readonly #queries: ReturnType<MyRepo['getQueries']>;

  constructor(db: Kysely<Database>) {
    this.#queries = this.getQueries(db);
  }

  getByID(id: number) {
    return this.#queries.getByID(id).executeTakeFirst(db, { userID: id });
  }

  getByName(name: number) {
    return this.#queries.getByName(name).execute(db, { name });
  }

  private getQueries(db: Kysely<Database>) {
    return {
      getByID: parameterizeQuery(db.selectFrom('users').selectAll()).asFollows<{
        userID: number;
      }>(({ qb, param }) => qb.where('id', '=', param('userID'))),

      getByName: parameterizeQuery(
        db.selectFrom('users').selectAll()
      ).asFollows<{
        name: string;
      }>(({ qb, param }) => qb.where('name', '=', param('name'))),
    };
  }
}
```

## Parameters

Parameters can be of any type allowed by the database dialect in use, and each can only be used in a query where its type is valid. You can use parameters as inserted values, as updated values, and as right-hand-side values in `where` expressions.

Here's an example parameterized `where` expression:

```ts
const parameterization = parameterizeQuery(
  db.selectFrom('posts').select(['title', 'authorId'])
).asFollows<{ postAuthorId: number }>(({ qb, param }) =>
  qb.where(({ and, cmpr }) =>
    and([
      cmpr('authorId', '=', param('postAuthorId')),
      cmpr('status', '=', 'published'),
    ])
  )
);
```

Parameters are allowed in SQL expressions, as illustrated in this deletion:

```ts
// prettier-ignore
const parameterization = parameterizeQuery(
  db.deleteFrom('posts')
).asFollows<{ postStatus: string }>(({ qb, param }) =>
  qb.where(sql`status = ${param('postStatus')}`)
);
```

They can be used in place of values in inserted objects:

```ts
const parameterization = parameterizeQuery(
  db.insertInto('posts').returning('id')
).asFollows<PostParams>(({ qb, param }) =>
  qb.values({
    title: param('postTitle'),
    authorId: param('postAuthorId'),
    status: 'draft',
  })
);
```

And in place of values in update objects:

```ts
// prettier-ignore
const parameterization = parameterizeQuery(
  db.updateTable('posts')
).asFollows<PostParams & { modifiedAt: Date }>(({ qb, param }) =>
  qb
    .set({
      title: param('postTitle'),
      modifiedAt: param('modifiedAt'),
    })
    .where('authorId', '=', param('postAuthorId'))
);
```

However, parameters cannot be arrays, though you can parameterize the individual elements of a array, as in this example:

```ts
const parameterization = parameterizeQuery(
  db.selectFrom('users').selectAll()
).asFollows<YearParams>(({ qb, param }) =>
  qb.where('birthYear', 'in', [param('year1'), param('year2'), 2000])
);
```

The type parameter passed to `parameterize` is an object of type `ParametersObject` whose properties are the parameter names, with the type given each property being the parameter's type. In the above examples, `PostParams` would define an object have properties `title` with type `string` and `postAuthorId` with type number, and `YearParams` would define an object having properties `year1` and `year2`, both having type `number`.

## Parameterizations

The `asFollows` method returns an instance of `ParameterizedQuery` having the provided parameterization. Please see the [API for `ParameterizedQuery`](https://github.com/jtlapp/kysely-params/blob/main/src/lib/parameterized-query.ts), which allows for executing and instantiating parameterizations.

`ParameterizedQuery` is available for import, should you need variables of this type. The following query accepts a `targetId` parameter and returns the `name` column:

```ts
import { ParameterizedQuery } from 'kysely-params';

interface Params {
  targetId: number;
}

let parameterization: ParameterizedQuery<Params, { name: string }>;

parameterization = parameterizeQuery(
  db.selectFrom('users').select('name')
).asFollows<Params>(({ qb, param }) => qb.where('id', '=', param('targetId')));
```

Be mindful of the type parameter you provide to `parameterize` for defining query parameters. When you execute or instantiate a parameterization, you must provide values for **_all_** of the parameters given in this type, as the execution and instantation methods do not know which parameters were actually used in the query.

## License

MIT License. Copyright &copy; 2023 Joseph T. Lapp
