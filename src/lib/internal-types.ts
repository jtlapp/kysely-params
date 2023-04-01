/**
 * Type representing an object having at least one property.
 * @typeparam T Object to constrain to being non-empty.
 */
// from https://stackoverflow.com/a/59987826/650894
export type NonEmptyObject<T> = { [K in keyof T]: Pick<T, K> }[keyof T];

/**
 * Type that makes all properties of an object non-nullable.
 * @typeparam T Object to make non-nullable.
 * @typeparam K Keys of the object to make non-nullable.
 */
export type NoNullsObject<T, K extends keyof T = keyof T> = {
  [P in K]: NonNullable<T[P]>;
} & T;

/**
 * Type that prevents an object from having array properties.
 */
export type NoArraysObject<T> = {
  [P in keyof T]: T[P] extends Array<any> ? never : T[P];
};

/**
 * Type that prevents an object from having nullable properties.
 */
export type NoNulls<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * Type representing an object having at least one property and all of
 * whose properties are non-nullable.
 * @typeparam T Object to constrain to being non-empty and non-nullable.
 * @typeparam K Keys of the object to make non-nullable.
 */
// export type NonEmptyNoNullsNoArraysObject<T> = NoNulls<
//   NoArraysObject<NonEmptyObject<T>>
// >;

export type NonEmptyNoNullsNoArraysObject<
  T,
  K extends keyof T = keyof T
> = NoNullsObject<NoArraysObject<NonEmptyObject<T>>, K>;
