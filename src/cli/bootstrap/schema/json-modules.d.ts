declare module '*.schema.json' {
  const value: Record<string, unknown>;
  export default value;
}

declare module '@rudironsoni/specs-schema/schema/component' {
  const value: {
    definitions: {
      Component: Record<string, unknown>;
      [key: string]: Record<string, unknown>;
    };
  };
  export default value;
}
