import { resolveInstancerConfigs } from './apps/api/src/providers/instancer/resolve.ts';
import { loadFileConfigs, loadEnvConfig } from './packages/config/src/loader.ts';
import { normalizeConfig } from './packages/config/src/normalize.ts';
import { ServerConfigSchema } from './packages/config/src/types.ts';
import deepMerge from 'deepmerge';

const parsedConfig = ServerConfigSchema.parse(
  deepMerge.all([...loadFileConfigs('./rctf.d'), loadEnvConfig()])
);
const config = normalizeConfig(parsedConfig);
console.log(resolveInstancerConfigs(config));