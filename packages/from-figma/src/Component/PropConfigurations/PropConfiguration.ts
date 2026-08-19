import type { PropConfigurationValue } from './PropConfigurations.js';

export class PropConfiguration {
  readonly key: string;
  readonly value: PropConfigurationValue;

  constructor(key: string, value: PropConfigurationValue) {
    this.key = key;
    this.value = value;
  }
}
