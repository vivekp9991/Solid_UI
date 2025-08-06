import { createSignal, For } from 'solid-js';


function BacktestTab(props) {
    const [activeSubTab, setActiveSubTab] = createSignal('strategy');

     const [symbol, setSymbol] = createSignal(props.backtestParamsData.symbol);
    const [timeframe, setTimeframe] = createSignal(props.backtestParamsData.timeframe);
    const [shares, setShares] = createSignal(props.backtestParamsData.shares);
    const [startDate, setStartDate] = createSignal(props.backtestParamsData.startDate);
    const [endDate, setEndDate] = createSignal(props.backtestParamsData.endDate);

    const [strategyPerformanceData, setStrategyPerformanceData] = createSignal([]);
    const [advancedReturnsData, setAdvancedReturnsData] = createSignal([]);
    const [dividendCalculationsData, setDividendCalculationsData] = createSignal([]);
    const [stockInfoData, setStockInfoData] = createSignal([]);
    const [paymentHistoryData, setPaymentHistoryData] = createSignal([]);
    const [totalReceived, setTotalReceived] = createSignal('');
    const [divAdjCost, setDivAdjCost] = createSignal(0);
    const [totalDividend, setTotalDividend] = createSignal(0);
    const [totalDivPercent, setTotalDivPercent] = createSignal(0);
    const subTabs = [
        { id: 'strategy', icon: '📊', label: 'Strategy Performance' },
        { id: 'returns', icon: '💰', label: 'Advanced Returns' },
        { id: 'dividends', icon: '💵', label: 'Dividend Calculations' },
        { id: 'stock', icon: '📈', label: 'Stock Information' },
        { id: 'history', icon: '📋', label: 'Payment History' }
    ];

     const runBacktest = async () => {
        props.setLoading?.(true);
        const payload = {
            ticker: symbol(),
            timeframe: timeframe(),
            quantity: Number(shares()),
            startDate: startDate(),
            endDate: endDate()
        };

       try {
            const res = await fetch('http://localhost:3000/api/v1/backtest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

        const yearlyAverage = (data.pnLWithDividendPercent / (data.analysisPeriod.durationMonths / 12)).toFixed(2);
        const divAdjustedCost = (data.totalInvestment - data.totalDividend) / data.totalShares;
        const divAdjustedYield = (data.annualDividendPerShare / divAdjustedCost) * 100;
        const monthlyAvg = data.dividendCalculationDetails.totalDividendIncome / data.dividendCalculationDetails.periodsWithIncome;
        const annualProj = data.annualDividendPerShare * data.totalShares;
        const priceDiff = data.currentPrice - data.averageBuyPrice;
        const priceDiffPercent = (priceDiff / data.averageBuyPrice) * 100;

        setDivAdjCost(divAdjustedCost);
        setTotalDividend(data.totalDividend);
        setTotalDivPercent(data.totalDivPercent);

        setStrategyPerformanceData([
            { label: 'Success Rate', value: `${data.redCandleSuccessRate.toFixed(2)}%`, positive: data.redCandleSuccessRate >= 0 },
            { label: 'Red Candles', value: `${data.redCandlePeriods} / ${data.totalCandlePeriods}` },
            { label: 'Analysis Period', value: `${data.analysisPeriod.durationMonths.toFixed(1)} months` },
            { label: 'Capital Growth', value: `${data.pnLPercent.toFixed(2)}%`, positive: data.pnLPercent >= 0 },
            { label: 'Dividend Return', value: `${data.totalDivPercent.toFixed(2)}%`, positive: data.totalDivPercent >= 0 },
            { label: 'Total Return', value: `${data.pnLWithDividendPercent.toFixed(2)}%`, positive: data.pnLWithDividendPercent >= 0 },
            { label: 'Yearly Average', value: `${yearlyAverage}%`, positive: yearlyAverage >= 0 }
        ]);

        setAdvancedReturnsData([
            { label: 'Capital Appreciation', value: `$${data.pnL.toFixed(2)} (${data.pnLPercent.toFixed(2)}%)`, positive: data.pnL >= 0 },
            { label: 'Dividend Income', value: `$${data.totalDividend.toFixed(2)} (${data.totalDivPercent.toFixed(2)}%)`, positive: data.totalDividend >= 0 },
            { label: 'Total Return', value: `$${data.pnLWithDividend.toFixed(2)} (${data.pnLWithDividendPercent.toFixed(2)}%)`, positive: data.pnLWithDividend >= 0 },
            { label: 'Yearly Average Return', value: `${yearlyAverage}%`, positive: yearlyAverage >= 0 },
            { label: 'Div Adjusted Return', value: `${((data.pnLWithDividend / (data.totalInvestment - data.totalDividend)) * 100).toFixed(2)}%`, positive: data.pnLWithDividend >= 0 }
        ]);

        setDividendCalculationsData([
            { label: 'Current Yield', value: `${data.lastDividendYield.toFixed(2)}%`, positive: data.lastDividendYield >= 0 },
            { label: 'Yield on Cost', value: `${data.yieldOnCost.toFixed(2)}%`, positive: data.yieldOnCost >= 0 },
            { label: 'Div Adj. Avg Cost', value: `$${divAdjustedCost.toFixed(2)}`, color: '#8b5cf6' },
            { label: 'Div Adj. Yield', value: `${divAdjustedYield.toFixed(2)}%`, positive: divAdjustedYield >= 0 },
            { label: 'TTM Yield', value: `${data.ttmDividendYield.toFixed(2)}%`, positive: data.ttmDividendYield >= 0 },
            { label: 'Monthly Average', value: `$${monthlyAvg.toFixed(2)}`, positive: monthlyAvg >= 0 },
            { label: 'Annual Projected', value: `$${annualProj.toFixed(2)}`, positive: annualProj >= 0 }
        ]);

        setStockInfoData([
            { label: 'Current Price', value: `$${data.currentPrice.toFixed(2)}` },
            { label: 'Average Cost', value: `$${data.averageBuyPrice.toFixed(2)}` },
            { label: 'Div Adj. Avg Cost', value: `$${divAdjustedCost.toFixed(2)}`, color: '#8b5cf6' },
            { label: 'Price Difference', value: `${priceDiff >= 0 ? '+' : ''}$${priceDiff.toFixed(2)} (${priceDiffPercent.toFixed(2)}%)`, positive: priceDiff >= 0 },
            { label: 'Total Shares', value: `${data.totalShares}` },
            { label: 'Market Value', value: `$${data.totalValueToday.toFixed(2)}` },
            { label: 'Cost Basis', value: `$${data.totalInvestment.toFixed(2)}` }
        ]);

        setPaymentHistoryData(
            data.dividendHistory.map(hist => ({
                year: hist.year.toString(),
                total: `$${hist.totalAmount.toFixed(2)}`,
                months: hist.payments.map(p => ({ month: `${p.label} ${hist.year}`, filled: p.status === 'paid' }))
            }))
        );

         setTotalReceived(`$${data.dividendCalculationDetails.totalDividendIncome.toFixed(2)}`);
        } finally {
            props.setLoading?.(false);
        }
    };

    return (
        <div id="backtest-tab">
            <div class="content-header">
                <h2 class="content-title">Backtesting Analytics</h2>
            </div>
            <div class="backtest-section">
                <div class="backtest-params">
                    <h3 style={{ 'margin-bottom': '1rem', color: '#1e293b' }}>Backtesting Parameters</h3>
                    <div class="backtest-form">
                        <div class="form-group">
                            <label>Symbol</label>
                            <input type="text" value={symbol()} onInput={e => setSymbol(e.target.value)} />
                        </div>
                        <div class="form-group">
                            <label>Timeframe</label>
                             <select value={timeframe()} onInput={e => setTimeframe(e.target.value)}>
                                <option>1D</option>
                                <option>1W</option>
                                <option>1M</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Shares/Trade</label>
                              <input type="number" value={shares()} onInput={e => setShares(e.target.value)} />
                        </div>
                        <div class="form-group">
                            <label>Start Date</label>
                             <input type="date" value={startDate()} onInput={e => setStartDate(e.target.value)} />
                        </div>
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" value={endDate()} onInput={e => setEndDate(e.target.value)} />
                        </div>
                        <div class="form-group">
                            <button class="backtest-btn" onClick={runBacktest}>Backtest</button>
                        </div>
                    </div>
                </div>
                <div class="sub-tabs">
                    <For each={subTabs}>
                        {tab => (
                            <div
                                class={`sub-tab ${activeSubTab() === tab.id ? 'active' : ''}`}
                                data-subtab={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                            >
                                {tab.icon} {tab.label}
                            </div>
                        )}
                    </For>
                </div>
                <div id="strategy-subtab" class={`sub-tab-content ${activeSubTab() === 'strategy' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📊 Strategy Performance</div>
                        <div class="results-grid">
                           <For each={strategyPerformanceData()}>
                                {row => (
                                    <div class="result-row">
                                        <span>{row.label}</span>
                                        <span class={row.positive ? 'result-value positive' : 'result-value'}>{row.value}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                        <div class="strategy-note">Strategy: Buy {shares()} shares on each red {timeframe()} candle</div>
                    </div>
                </div>
                <div id="returns-subtab" class={`sub-tab-content ${activeSubTab() === 'returns' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📈 Advanced Returns</div>
                        <div class="results-grid">
                            <For each={advancedReturnsData()}>
                                {row => (
                                    <div class="result-row">
                                        <span>{row.label}</span>
                                        <span class={row.positive ? 'result-value positive' : 'result-value'}>{row.value}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                         <div class="strategy-note" style={{ 'margin-top': '0.5rem' }}>
                            Div Adjusted Cost Basis: ${divAdjCost().toFixed(2)}/share
                        </div>
                        <div class="strategy-note" style={{ 'margin-top': '0.5rem', color: '#059669' }}>
                            Total Income: ${totalDividend().toFixed(2)} ({totalDivPercent().toFixed(2)}% of investment)
                        </div>
                    </div>
                </div>
                <div id="dividends-subtab" class={`sub-tab-content ${activeSubTab() === 'dividends' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📋 Dividend Calculations</div>
                        <div class="results-grid">
                            <For each={dividendCalculationsData()}>
                                {row => (
                                    <div class="result-row">
                                        <span>{row.label}</span>
                                        <span class={row.positive ? 'result-value positive' : row.color ? 'result-value' : 'result-value'} style={row.color ? { color: row.color } : {}}>{row.value}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </div>
                <div id="stock-subtab" class={`sub-tab-content ${activeSubTab() === 'stock' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">Stock Information</div>
                        <div class="results-grid">
                            <For each={stockInfoData()}>
                                {row => (
                                    <div class="result-row">
                                        <span>{row.label}</span>
                                        <span class={row.positive ? 'result-value positive' : row.color ? 'result-value' : 'result-value'} style={row.color ? { color: row.color } : {}}>{row.value}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </div>
                <div id="history-subtab" class={`sub-tab-content ${activeSubTab() === 'history' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">Payment History</div>
                        <div class="payment-history">
                             <For each={paymentHistoryData()}>
                                {year => (
                                    <div class="payment-year">
                                        <div class="year-header">
                                            <span class="year-label">{year.year}</span>
                                            <span class="year-total">{year.total}</span>
                                        </div>
                                        <div class="payment-dots">
                                            <For each={year.months}>
                                                {month => (
                                                    <div class={`payment-dot ${month.filled ? 'filled' : 'empty'}`} title={month.month}></div>
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                )}
                            </For>
                             <div class="total-received">Total Received: {totalReceived()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BacktestTab;