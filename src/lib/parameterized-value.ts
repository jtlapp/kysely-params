/**
 * Class representing a parameter-specified value.
 * @paramtype P Record characterizing the parameter names and types.
 */
export class ParameterizedValue<P extends Record<string, any>> {
  /**
   * Creates a new parameter-specified value.
   * @param parameterName Name of the parameter.
   */
  constructor(readonly parameterName: keyof P & string) {}
}
