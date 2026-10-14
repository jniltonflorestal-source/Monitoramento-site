import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { collectS2id, applyS2idProduct } from './s2id-source.mjs';

// Run from the repository root. --output exports only the validated source product.
const { values } = parseArgs({ options: { output: { type: 'string' } } });
try {
  const product = await collectS2id();
  if (values.output) {
    await writeFile(values.output, `${JSON.stringify(product, null, 2)}\n`, 'utf8');
  } else {
    const file = new URL('../dados-monitoramento.json', import.meta.url);
    const data = JSON.parse(await readFile(file, 'utf8'));
    applyS2idProduct(data, product);
    await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify({ fonte: product.fonte, atualizadoEm: product.atualizadoEm, resumo: product.resumo, municipios: product.reconhecimentos_vigentes.map(record => record.municipio) }));
} catch (error) {
  console.error(`S2ID: ${error.message}. Nenhum dado anterior foi substituído.`);
  process.exitCode = 1;
}
