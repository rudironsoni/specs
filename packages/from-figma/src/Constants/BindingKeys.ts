export const BINDING_KEY_MAP = {
  visible: 'visible',
  characters: 'characters',
  mainComponent: 'mainComponent',
  slotContentId: 'slotContentId',
} as const;

export type BindingKey = keyof typeof BINDING_KEY_MAP;
