# kysely-params

A Kysely extension for parameterizing compiled queries

## Overview

This package allows you to parameterize compiled [Kysely](https://github.com/kysely-org/kysely) queries. It adds a `parameterize` method to the Kysely insert, select, update, and delete query builders. This method takes a function that allows you to selectively parameterize inserted, updated, and compared values. It returns a parameterization that can be repeatedly called to execute or instantiate the query with different values for the parameters. On its first call, the query is compiled and its compilation cached, and the sourcing query builder is discarded to free memory. Subsequent calls use the cached compilation.

## Installation

Install both Kysely and the package with your preferred dependency manager:

```
npm install kysely kysely-params
yarn add kysely kysely-params
pnpm add kysely kysely-params
```

Then import `kysely-params` into each file that will parameterize queries:

```ts
import 'kysely-params';
```

## Usage

The first step is to parameterize a query. Consider the following example:

```ts
interface UserParams {
  targetNickname: string;
  targetBirthYear: number;
}

const parameterization = db
  .selectFrom('users')
  .selectAll()
  .parameterize<UserParams>(({ qb, param }) =>
    qb
      .where('nickname', '=', param('targetNickname'))
      .where('birthYear', '=', param('targetBirthYear'))
      .where('state', '=', 'Virginia')
  );
```

This produces a parameterization of the query but does not yet compile or execute the query. The example `Params` interface defines the available parameters and their types. `qb` is a regular Kysely query builder -- in this case, a `SelectQueryBuilder`. Call `param` with a parameter name where you would like to be able to vary the value.

When parameterizing a select query, you must select the returned columns before calling `parameterize`. You will not get a compiler error for doing otherwise, but you will get a runtime exception describing the problem.

The second step is to execute the parameterized query. You can execute a parameterized query as many times as you wish. The `execute` and `executeTakeFirst` methods are available, as is an `instantiate` method for returning a [`CompiledQuery`](https://github.com/kysely-org/kysely/blob/master/site/docs/recipes/splitting-build-compile-and-execute-code.md#execute-compiled-queries) with all parameters replaced with values:

```ts
const results = await parameterization.execute(db, {
  targetNickname: 'Johnny',
  targetBirthYear: 1980,
});

const result1 = await parameterization.executeTakeFirst(db, {
  targetNickname: 'Joey',
  targetBirthYear: 2000,
});

const compiledQuery = parameterization.instantiate({
  targetNickname: 'Susie',
  targetBirthYear: 1990,
});
const result2 = await db.executeQuery(compiledQuery);
```

The query compiles on the first call to `execute` or `executeTakeFirst`, and the compilation is used on that and subsequent calls. The first argument is the instance of `Kysely`, and the second is an object that provides the values of the parameters.

## Parameters

Parameters can be of any type allowed by the database dialect in use, and each can only be used in a query where its type is valid. You can use parameters as inserted values, as updated values, and as right-hand-side values in `where` expressions.

Here's an example parameterized `where` expression:

```ts
const parameterization = db
  .selectFrom('posts')
  .select(['title', 'authorId'])
  .parameterize<{ postAuthorId: number }>(({ qb, param }) =>
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
const parameterization = db
  .deleteFrom('posts')
  .parameterize<{ postStatus: string }>(({ qb, param }) =>
    qb.where(sql`status = ${param('postStatus')}`)
  );
```

They can be used in place of values in inserted objects:

```ts
const parameterization = db
  .insertInto('posts')
  .parameterize<PostParams>(({ qb, param }) =>
    qb
      .values({
        title: param('postTitle'),
        authorId: param('postAuthorId'),
        status: 'draft',
      })
      .returning('id')
  );
```

And in place of values in update objects:

```ts
const parameterization = db
  .updateTable('posts')
  .parameterize<PostParams & { modifiedAt: Date }>(({ qb, param }) =>
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
const parameterization = db
  .selectFrom('users')
  .selectAll()
  .parameterize<YearParams>(({ qb, param }) =>
    qb.where('birthYear', 'in', [param('year1'), param('year2'), 2000])
  );
```

The type parameter passed to `parameterize` is an object whose properties are the parameter names, with the type given each property being the parameter's type. In the above examples, `PostParams` would define an object have properties `title` with type `string` and `postAuthorId` with type number, and `YearParams` would define an object having properties `year1` and `year2`, both having type `number`.

## Parameterizations

The `parameterize` method returns an instance of `ParameterizedQuery`. Please see [parameterization.ts](https://github.com/jtlapp/kysely-params/blob/main/src/lib/parameterization.ts) for its API, which allows for executing and instantiated parameterizations

When you execute or instantiate a parameterization, you must provide values for **_all_** of the parameters given in this type, as the execution and instantation methods do not know which parameters were actually used in the query. Be mindful of this when you specify the parameters type parameter for `parameterize`.

## License

MIT License. Copyright &copy; 2023 Joseph T. Lapp
