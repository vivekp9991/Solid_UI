import { Show } from 'solid-js';
import HoldingsTab from './HoldingsTab';
import PortfolioAnalysisTab from './PortfolioAnalysisTab'; // Renamed from DividendsTab
import BacktestTab from './BacktestTab';

function ContentArea(props) {
    return (
        <div class="content-area">
            <Show when={props.activeTab() === 'holdings'}>
                <HoldingsTab stockData={props.stockData} />
            </Show>
            <Show when={props.activeTab() === 'portfolioAnalysis'}>
               <PortfolioAnalysisTab analysisData={props.portfolioAnalysisData} />
            </Show>
            <Show when={props.activeTab() === 'backtest'}>
             <BacktestTab backtestParamsData={props.backtestParamsData} setLoading={props.setLoading} />
            </Show>
        </div>
    );
}

export default ContentArea;