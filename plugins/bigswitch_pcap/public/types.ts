import { DataPublicPluginSetup, DataPublicPluginStart } from 'src/plugins/data/public';
import { ExpressionsSetup } from '../../../src/plugins/expressions/public';
import { VisualizationsSetup } from '../../../src/plugins/visualizations/public';

export interface PcapPluginSetup {
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PcapPluginStart {}

export interface PcapPluginSetupDependencies{
  data : DataPublicPluginSetup;
  expressions: ExpressionsSetup;
  visualizations: VisualizationsSetup;
}

export interface PcapPluginStartDependencies{
  data : DataPublicPluginStart; 
}

export interface AppPluginStartDependencies {
}
