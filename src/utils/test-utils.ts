/**
 * Embeds code that will never run within a callback. Useful for
 * testing expected type errors.
 * @param description Description of the code that will never run
 * @param callback Callback that will never run
 */
export function ignore(_description: string, _: () => void) {}
