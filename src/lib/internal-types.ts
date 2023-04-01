// from https://stackoverflow.com/a/59987826/650894
export type NonEmptyObject<T> = { [K in keyof T]: Pick<T, K> }[keyof T];
