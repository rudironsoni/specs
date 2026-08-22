export interface VueSfc {
  template: string;
  script: string;
  styles: string;
}

export function parseSfc(source: string): VueSfc {
  const template = sliceBlock(source, 'template');
  const script = sliceBlock(source, 'script');
  const styles = sliceBlock(source, 'style');
  return { template, script, styles };
}

function sliceBlock(source: string, tag: string): string {
  const open = source.indexOf(`<${tag}`);
  if (open === -1) return '';
  const gt = source.indexOf('>', open);
  if (gt === -1) return '';
  const close = source.indexOf(`</${tag}>`, gt + 1);
  if (close === -1) return source.slice(gt + 1);
  return source.slice(gt + 1, close);
}
