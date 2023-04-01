/**
 * Type representing an object having at least one property.
 * @typeparam T Object to constrain to being non-empty.
 */
// from https://stackoverflow.com/a/59987826/650894
export type NonEmptyObject<T> = { [K in keyof T]: Pick<T, K> }[keyof T];

/**
 * Type that prevents an object from having array properties.
 */
export type NoArrays<T> = {
  [P in keyof T]: T[P] extends Array<any> ? never : T[P];
};

/**
 * Type representing an object having at least one property and all of
 * whose properties are non-nullable.
 * @typeparam T Object to constrain to being non-empty and non-nullable.
 * @typeparam K Keys of the object to make non-nullable.
 */
export type NonEmptyNoArraysObject<T> = NoArrays<NonEmptyObject<T>>;
