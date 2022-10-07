import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { PcapPluginSetup, PcapPluginStart } from './types';
import { defineRoutes } from './routes';

export class PcapPlugin implements Plugin<PcapPluginSetup, PcapPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('pcap: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('pcap: Started');
    return {};
  }

  public stop() {}
}
