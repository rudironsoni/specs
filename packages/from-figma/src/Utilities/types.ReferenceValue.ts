export interface ReferenceValue {
  $ref: string;
}

export function isReferenceValue(value: unknown): value is ReferenceValue {
  return Boolean(value && typeof value === 'object' && '$ref' in value && typeof (value as { $ref: unknown }).$ref === 'string');
}

export type BindingKey = 'children' | 'instanceOf' | 'visible' | 'text';
