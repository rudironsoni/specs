import './registerAdapters.js';
import { NodeIndexer } from './NodeIndexer.js';
import { RestBaseNode } from './RestBaseNode.js';
import { RestComponentNode } from './RestComponentNode.js';
import { wrapNode } from './wrapNode.js';
import type { RestApiFileData, RestApiNodeData } from './types.js';

export class RestLibraryFile {
  private _data: RestApiFileData;
  private _indexer: NodeIndexer;

  constructor(data: unknown) {
    this._data = this.validate(data);
    this._indexer = new NodeIndexer(
      this._data.document,
      this._data.components,
      this._data.componentSets,
    );
  }

  private validate(data: unknown): RestApiFileData {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid Figma REST JSON: expected an object');
    }
    const file = data as RestApiFileData;
    if (!file.document || typeof file.document !== 'object') {
      throw new Error('Invalid Figma REST JSON: missing document');
    }
    return file;
  }

  getIndexer(): NodeIndexer {
    return this._indexer;
  }

  get name(): string | undefined {
    return this._data.name;
  }

  findComponent(nameOrId: string): RestBaseNode | null {
    const raw = this._indexer.findByNameOrId(nameOrId, 'COMPONENT', 'COMPONENT_SET', 'FRAME');
    if (!raw) return null;
    const wrapped = wrapNode(raw as RestApiNodeData, null);
    wrapped.setIndexer(this._indexer);
    return wrapped;
  }

  findAllComponents(): RestComponentNode[] {
    return this._indexer
      .findAllByType('COMPONENT', 'COMPONENT_SET')
      .map((raw) => {
        const wrapped = wrapNode(raw as RestApiNodeData, null);
        wrapped.setIndexer(this._indexer);
        return wrapped instanceof RestComponentNode
          ? wrapped
          : new RestComponentNode(raw as RestApiNodeData, null);
      });
  }
}
