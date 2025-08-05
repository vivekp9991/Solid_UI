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
                <PortfolioAnalysisTab
                    portfolioSummaryData={props.portfolioSummaryData}
                    dividendCardsData={props.dividendCardsData}
                    yieldCalculatorData={props.yieldCalculatorData}
                    dividendCalendarData={props.dividendCalendarData}
                />
            </Show>
            <Show when={props.activeTab() === 'backtest'}>
                <BacktestTab
                    backtestParamsData={props.backtestParamsData}
                    strategyPerformanceData={props.strategyPerformanceData}
                    advancedReturnsData={props.advancedReturnsData}
                    dividendCalculationsData={props.dividendCalculationsData}
                    stockInfoData={props.stockInfoData}
                    paymentHistoryData={props.paymentHistoryData}
                />
            </Show>
        </div>
    );
}

export default ContentArea;