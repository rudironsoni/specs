export interface PropPairCandidate {
  elementName: string;
  visiblePropName: string;
  contentKey: 'mainComponent' | 'characters' | 'slotContentId';
  contentPropName: string;
}

export interface PropPair {
  elementName: string;
  booleanPropName: string;
  contentKey: 'mainComponent' | 'characters' | 'slotContentId';
  contentPropName: string;
  contentType: 'glyph' | 'string' | 'slot';
  booleanDefault: boolean;
}
