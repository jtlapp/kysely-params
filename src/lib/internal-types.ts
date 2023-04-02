/**
 * Type that prevents an object from having array properties.
 * @typeparam T Object to constrain to having no arrays.
 */
export type NoArraysObject<T> = {
  [P in keyof T]: T[P] extends Array<any> ? never : T[P];
};
