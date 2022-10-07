import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { BigSwitchFabricAppPluginSetup, BigSwitchFabricAppPluginStart } from './types';
import { defineRoutes } from './routes';

export class BigSwitchFabricAppPlugin
  implements Plugin<BigSwitchFabricAppPluginSetup, BigSwitchFabricAppPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('BigSwitchFabricApp: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('BigSwitchFabricApp: Started');
    return {};
  }

  public stop() {}
}
