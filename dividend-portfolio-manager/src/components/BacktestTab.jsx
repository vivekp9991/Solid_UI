import { createSignal, For } from 'solid-js';

function BacktestTab(props) {
    const [activeSubTab, setActiveSubTab] = createSignal('strategy');

    const subTabs = [
        { id: 'strategy', icon: '📊', label: 'Strategy Performance' },
        { id: 'returns', icon: '💰', label: 'Advanced Returns' },
        { id: 'dividends', icon: '💵', label: 'Dividend Calculations' },
        { id: 'stock', icon: '📈', label: 'Stock Information' },
        { id: 'history', icon: '📋', label: 'Payment History' }
    ];

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
                            <input type="text" value={props.backtestParamsData.symbol} />
                        </div>
                        <div class="form-group">
                            <label>Timeframe</label>
                            <select value={props.backtestParamsData.timeframe}>
                                <option>1W</option>
                                <option>1M</option>
                                <option>3M</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Shares/Trade</label>
                            <input type="number" value={props.backtestParamsData.shares} />
                        </div>
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" value={props.backtestParamsData.startDate} />
                        </div>
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" value={props.backtestParamsData.endDate} />
                        </div>
                        <div class="form-group">
                            <button class="backtest-btn">Backtest</button>
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
                            <For each={props.strategyPerformanceData}>
                                {row => (
                                    <div class="result-row">
                                        <span>{row.label}</span>
                                        <span class={row.positive ? 'result-value positive' : 'result-value'}>{row.value}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                        <div class="strategy-note">Strategy: Buy 10 shares on each red 1W candle</div>
                    </div>
                </div>
                <div id="returns-subtab" class={`sub-tab-content ${activeSubTab() === 'returns' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📈 Advanced Returns</div>
                        <div class="results-grid">
                            <For each={props.advancedReturnsData}>
                                {row => (
                                    <div class="result-row">
                                        <span>{row.label}</span>
                                        <span class={row.positive ? 'result-value positive' : 'result-value'}>{row.value}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                        <div class="strategy-note">Yearly Average: 14.20% = 1.58 years = 8.99%</div>
                        <div class="strategy-note" style={{ 'margin-top': '0.5rem' }}>Div Adjusted Cost Basis: $11.98/share</div>
                        <div class="strategy-note" style={{ 'margin-top': '0.5rem', color: '#059669' }}>
                            Total Income: $479.55 (9.77% of investment)
                        </div>
                    </div>
                </div>
                <div id="dividends-subtab" class={`sub-tab-content ${activeSubTab() === 'dividends' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📋 Dividend Calculations</div>
                        <div class="results-grid">
                            <For each={props.dividendCalculationsData}>
                                {row => (
                                    <div class="result-row">
                                        <span>{row.label}</span>
                                        <span class={row.positive ? 'result-value positive' : row.color ? 'result-value' : 'result-value'} style={row.color ? { color: row.color } : {}}>{row.value}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                        <div class="strategy-note">Dividend Impact on Cost</div>
                        <div class="strategy-note" style={{ 'margin-top': '0.5rem', color: '#8b5cf6' }}>
                            Effective Cost: $4,910.55 - $479.55 = $4,431.00<br />
                            Div Adj. Cost/Share: $4,431.00 ÷ 370 = $11.98
                        </div>
                    </div>
                </div>
                <div id="stock-subtab" class={`sub-tab-content ${activeSubTab() === 'stock' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">Stock Information</div>
                        <div class="results-grid">
                            <For each={props.stockInfoData}>
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
                            <For each={props.paymentHistoryData}>
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
                            <div class="total-received">Total Received: $479.55</div>
                        </div>
                        <div class="strategy-note">Dividend Impact on Cost</div>
                        <div class="strategy-note" style={{ 'margin-top': '0.5rem', color: '#8b5cf6' }}>
                            Effective Cost: $4,910.55 - $479.55 = $4,431.00<br />
                            Div Adj. Cost/Share: $4,431.00 ÷ 370 = $11.98
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BacktestTab;