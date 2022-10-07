import { toExpressionAst } from './to_ast';
import { Options } from '../../common/components/vis_options_lazy';

export function getPcapVisTypeDefinition() {
    return{
	name: 'pcap',
	title: 'Recorder Node',
	icon: 'fa-info-circle',
	description: 'Big Switch PCAP',
	visConfig: {
	},
	editorConfig: {
	    optionsTemplate: Options,
	},
	toExpressionAst: toExpressionAst,
	requestHandler: 'none',
	responseHandler: 'none',
    };
}
