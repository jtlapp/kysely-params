/**
 * Class representing a parameterized argument.
 * @paramtype P Record characterizing the parameter names and types.
 */
export class ParamArg<P extends Record<string, any>> {
  constructor(readonly name: keyof P & string) {}
}

/**
 * Class for parameterizing queries.
 * @paramtype P Record characterizing the available parameter names and types.
 */
export class QueryParameterizer<P> {
  /**
   * Returns a parameterized argument.
   * @param name Parameter name.
   * @returns Parameter having the given name and the type assigned to that
   *  name in P.
   */
  param<N extends keyof P & string>(name: N): P[N] {
    return new ParamArg(name) as unknown as P[N];
  }
}
