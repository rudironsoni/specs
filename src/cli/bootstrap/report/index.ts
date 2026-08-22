import fs from 'fs-extra';
import path from 'node:path';
import { loadCandidateFile, loadDecisions, loadInventory, resolveWorkspace } from '../workspace.js';

export async function runReport(workspace: string): Promise<string> {
  const paths = resolveWorkspace(workspace);
  const inventory = await loadInventory(paths);
  const candidates = await loadCandidateFile(paths.deterministicCandidates);
  const decisions = await loadDecisions(paths);
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Specs bootstrap report</title></head>
<body>
<h1>Specs bootstrap report</h1>
<section id="components">
<h2>Component inventory</h2>
<ul>${inventory.components.map((c) => `<li><a href="#${c.observationId}">${c.id}</a></li>`).join('')}</ul>
</section>
<section id="tokens">
<h2>Token inventory</h2>
<ul>${inventory.styles.map((s) => `<li><a href="#${s.observationId}">${s.authored}</a></li>`).join('')}</ul>
</section>
<section id="usage">
<h2>Usage graph</h2>
<ul>${inventory.usages.map((u) => `<li>${u.kind} ${u.componentId} ${u.fromId ?? ''}</li>`).join('')}</ul>
</section>
<section id="composition">
<h2>Composition graph</h2>
<ul>${inventory.usages.filter((u) => u.kind === 'composed' || u.kind === 'wrapped').map((u) => `<li>${u.fromId} -> ${u.componentId}</li>`).join('')}</ul>
</section>
<section id="candidates">
<h2>Candidate families</h2>
<ul>${candidates.candidates.map((c) => `<li>${c.id} (${c.kind}) refs ${c.observationRefs.join(', ')}</li>`).join('')}</ul>
</section>
<section id="conflicts">
<h2>Conflicts</h2>
<ul>${candidates.candidates.flatMap((c) => c.conflicts.map((conflict) => `<li>${c.id}: ${conflict.kind}</li>`)).join('')}</ul>
</section>
<section id="missing">
<h2>Missing evidence</h2>
<ul>${inventory.failures.map((f) => `<li>${f.code}: ${f.message}</li>`).join('')}</ul>
</section>
<section id="decisions">
<h2>Decisions</h2>
<ul>${decisions.decisions.map((d) => `<li>${d.candidate}: ${d.decision}</li>`).join('')}</ul>
</section>
</body>
</html>
`;
  await fs.ensureDir(paths.reports);
  const file = path.join(paths.reports, 'index.html');
  await fs.writeFile(file, html);
  return file;
}
