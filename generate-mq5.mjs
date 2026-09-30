import { build } from 'esbuild';
import fs from 'fs';

await build({
  entryPoints: ['src/utils/mql5Generator.ts'],
  bundle: true,
  format: 'esm',
  outfile: '/tmp/mql5Generator.mjs',
  platform: 'node',
});

const { generateMQL5Code } = await import('/tmp/mql5Generator.mjs');
const presets = await (async () => {
  await build({ entryPoints: ['src/utils/presets.ts'], bundle: true, format: 'esm', outfile: '/tmp/presets.mjs', platform: 'node' });
  return import('/tmp/presets.mjs');
})();

const code = generateMQL5Code(presets.DEFAULT_EA_CONFIG);
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/MicroScalper_MT5_SmallAcc.mq5', code);
console.log('Wrote public/MicroScalper_MT5_SmallAcc.mq5 (' + code.split('\n').length + ' lines)');
