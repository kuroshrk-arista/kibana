import { PluginInitializerContext } from '../../../src/core/server';
import { PcapPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new PcapPlugin(initializerContext);
}

export { PcapPluginSetup, PcapPluginStart } from './types';
