import { buildExpression, buildExpressionFunction } from '../../../src/plugins/expressions/public';
import { VisToExpressionAst } from '../../../src/plugins/visualizations/public';
import { PcapExpressionFunctionDefinition } from './pcap_vis_fn';

interface PcapVisParams {};

export const toExpressionAst: VisToExpressionAst<PcapVisParams> = (vis, params) => {
    const pcap = buildExpressionFunction<PcapExpressionFunctionDefinition>(
	'pcap', {} );
									     
    const ast = buildExpression([pcap]);
    return ast.toAst();
};
