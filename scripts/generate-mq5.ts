/**
 * Regenerates the ready-to-download MQL5 Expert Advisor file from the
 * default EA configuration using the same generator that powers the
 * in-browser "Download .mq5 File" button.
 *
 * Usage: npm run generate:mq5
 */
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { generateMQL5Code } from '../src/utils/mql5Generator';
import { DEFAULT_EA_CONFIG } from '../src/utils/presets';

const outDir = path.resolve(process.cwd(), 'public');
mkdirSync(outDir, { recursive: true });

const code = generateMQL5Code(DEFAULT_EA_CONFIG);
const outFile = path.join(outDir, `${DEFAULT_EA_CONFIG.eaName}.mq5`);
writeFileSync(outFile, code, 'utf8');

console.log(`Wrote ${path.relative(process.cwd(), outFile)} (${code.split('\n').length} lines)`);
