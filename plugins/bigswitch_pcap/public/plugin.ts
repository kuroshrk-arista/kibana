import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '../../../src/core/public';
import { PcapPluginSetup, PcapPluginSetupDependencies, PcapPluginStart, PcapPluginStartDependencies } from './types';
import { registerPcapVis } from './register_vis';

export class PcapPlugin implements Plugin<
  PcapPluginSetup, PcapPluginStart, PcapPluginSetupDependencies, PcapPluginStartDependencies> {
  initializerContext: PluginInitializerContext;
  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup<PcapPluginStartDependencies>, deps: PcapPluginSetupDependencies): PcapPluginSetup {
    registerPcapVis(core, deps, this.initializerContext);
    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart): PcapPluginStart {
    return {};
  }

  public stop() { }
}
