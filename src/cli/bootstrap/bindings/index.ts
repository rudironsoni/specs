import fs from 'fs-extra';
import path from 'node:path';
import { getPlatformPack } from '../platforms/index.js';
import { codeConnectTemplate } from '../platforms/codeConnect.js';
import { packIdFromBindingPlatform } from '../platforms/names.js';
import { loadBindings, resolveWorkspace } from '../workspace.js';

export async function runBindingsGenerate(workspace: string, outputDir: string): Promise<string[]> {
  const paths = resolveWorkspace(workspace);
  const bindings = await loadBindings(paths);
  await fs.ensureDir(outputDir);
  const written: string[] = [];
  for (const binding of bindings.bindings) {
    for (const platform of Object.keys(binding.implementations).sort()) {
      const pack = getPlatformPack(packIdFromBindingPlatform(platform));
      const file = pack.codeConnect
        ? pack.codeConnect.template(binding)
        : codeConnectTemplate(binding, platform);
      const dest = path.join(outputDir, file.fileName);
      await fs.writeFile(dest, file.content);
      written.push(dest);
    }
  }
  return written;
}
