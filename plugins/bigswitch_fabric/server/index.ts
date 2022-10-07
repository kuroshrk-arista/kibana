import { PluginInitializerContext } from '../../../src/core/server';
import { BigSwitchFabricAppPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new BigSwitchFabricAppPlugin(initializerContext);
}

export { BigSwitchFabricAppPluginSetup, BigSwitchFabricAppPluginStart } from './types';
