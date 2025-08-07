import { createSignal, For, createMemo } from 'solid-js';

function PortfolioAnalysisTab(props) {
    const [activeSubTab, setActiveSubTab] = createSignal('portfolioMetrics');

    const analysis = createMemo(() => (props.analysisData ? props.analysisData() : {}) || {});

    const formatCurrency = (num) => {
        const n = Number(num);
        return isNaN(n) ? '$0.00' : `$${n.toFixed(2)}`;
    };

    const formatPercent = (num) => {
        const n = Number(num);
        return isNaN(n) ? '0%' : `${n.toFixed(2)}%`;
    };

    const overview = createMemo(() => analysis().overview || {});
    const dividend = createMemo(() => analysis().dividendAnalysis || {});
    const performance = createMemo(() => analysis().performanceBreakdown || {});
    const risk = createMemo(() => analysis().riskMetrics || {});
    const allocation = createMemo(() => analysis().allocationAnalysis || {});

    return (
        <div id="portfolioAnalysis-tab">
            <div class="content-header">
                <h2 class="content-title">Portfolio Analysis</h2>
            </div>
            <div class="backtest-section">
                <div class="portfolio-analysis-cards">
                    <div class="analysis-card current-gain">
                        <div class="analysis-header">
                            <div class="analysis-icon">📊</div>
                            <span>Current Gain</span>
                        </div>
                        <div class="analysis-value positive">{formatPercent(analysis().currentGainPercent)}</div>
                        <div class="analysis-subtitle">Current monthly</div>
                    </div>

                    
                    <div class="analysis-card dividends">
                        <div class="analysis-header">
                            <div class="analysis-icon">💰</div>
                            <span>Dividends</span>
                        </div>
                        <div class="analysis-value">{formatPercent(analysis().dividendsYieldPercent)}</div>
                        <div class="analysis-subtitle">Real-time calculation</div>
                    </div>
                    
                    
                    <div class="analysis-card total-returns">
                        <div class="analysis-header">
                            <div class="analysis-icon">💎</div>
                            <span>Total Returns</span>
                        </div>
                         <div class="analysis-value">{formatCurrency(analysis().totalReturnsValue)}</div>
                        <div class="analysis-subtitle">All time received</div>
                    </div>
                </div>

                <div class="sub-tabs">
                     <div
                        class={`sub-tab ${activeSubTab() === 'portfolioMetrics' ? 'active' : ''}`}
                        data-subtab="portfolioMetrics"
                        onClick={() => setActiveSubTab('portfolioMetrics')}
                    >
                        📊 Portfolio Metrics
                    </div>
                    <div
                        class={`sub-tab ${activeSubTab() === 'dividendAnalysis' ? 'active' : ''}`}
                        data-subtab="dividendAnalysis"
                        onClick={() => setActiveSubTab('dividendAnalysis')}
                    >
                        💰 Dividend Analysis
                    </div>
                    <div
                        class={`sub-tab ${activeSubTab() === 'performanceBreakdown' ? 'active' : ''}`}
                        data-subtab="performanceBreakdown"
                        onClick={() => setActiveSubTab('performanceBreakdown')}
                    >
                        📈 Performance Breakdown
                    </div>
                    <div
                        class={`sub-tab ${activeSubTab() === 'riskAnalysis' ? 'active' : ''}`}
                        data-subtab="riskAnalysis"
                        onClick={() => setActiveSubTab('riskAnalysis')}
                    >
                        ⚠️ Risk Analysis
                    </div>
                    <div
                        class={`sub-tab ${activeSubTab() === 'allocationAnalysis' ? 'active' : ''}`}
                        data-subtab="allocationAnalysis"
                        onClick={() => setActiveSubTab('allocationAnalysis')}
                    >
                        📋 Allocation Analysis
                    </div>
                </div>

                <div id="portfolioMetrics-subtab" class={`sub-tab-content ${activeSubTab() === 'portfolioMetrics' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📊 Portfolio Overview</div>
                        <div class="results-grid">
                            <div class="result-row">
                                <span>Total Investment</span>
                                <span class="result-value">{formatCurrency(overview().totalInvestment)}</span>
                            </div>

                            <div class="result-row">
                                <span>Current Value</span>
                                 <span class="result-value">{formatCurrency(overview().currentValue)}</span>
                            </div>
                            <div class="result-row">
                                <span>Total Return</span>
                                 <span class="result-value positive">{formatCurrency(overview().totalReturnValue)}</span>
                            </div>
                            <div class="result-row">
                                <span>Return Percentage</span>
                                <span class="result-value positive">{formatPercent(overview().returnPercent)}</span>
                            </div>
                            <div class="result-row">
                                <span>Number of Positions</span>
                                <span class="result-value">{overview().numberOfPositions}</span>
                            </div>
                            <div class="result-row">
                                <span>Average Position Size</span>
                                <span class="result-value">{formatCurrency(overview().averagePositionSize)}</span>
                            </div>
                            <div class="result-row">
                                <span>Largest Position</span>
                                <span class="result-value">{formatCurrency(overview().largestPosition?.value)} ({overview().largestPosition?.symbol})</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="dividendAnalysis-subtab" class={`sub-tab-content ${activeSubTab() === 'dividendAnalysis' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📋 Dividend Analysis</div>
                        <div class="results-grid">
                            <div class="result-row">
                                <span>Current Yield</span>
                                 <span class="result-value positive">{formatPercent(dividend().currentYieldPercent)}</span>
                            </div>
                            <div class="result-row">
                                <span>Yield on Cost</span>
                                <span class="result-value positive">{formatPercent(dividend().yieldOnCostPercent)}</span>
                            </div>
                            <div class="result-row">
                                <span>Div Adj. Avg Cost</span>
                                <span class="result-value" style="color: #8b5cf6;">{formatCurrency(dividend().dividendAdjustedAverageCost)}</span>
                            </div>
                            <div class="result-row">
                                <span>Div Adj. Yield</span>
                                <span class="result-value positive">{formatPercent(dividend().dividendAdjustedYieldPercent)}</span>
                            </div>
                            <div class="result-row">
                                <span>TTM Yield</span>
                                <span class="result-value positive">{formatPercent(dividend().ttmYieldPercent)}</span>
                            </div>
                            <div class="result-row">
                                <span>Monthly Average</span>
                                <span class="result-value positive">{formatCurrency(dividend().monthlyAverage)}</span>
                            </div>
                            <div class="result-row">
                                <span>Annual Projected</span>
                                <span class="result-value positive">{formatCurrency(dividend().annualProjected)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="performanceBreakdown-subtab" class={`sub-tab-content ${activeSubTab() === 'performanceBreakdown' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📈 Performance Analysis</div>
                        <div class="results-grid">
                            <div class="result-row">
                                <span>Capital Gains</span>
                                <span class="result-value positive">{formatCurrency(performance().capitalGainsValue)}</span>
                            </div>
                            <div class="result-row">
                                <span>Dividend Income</span>
                                <span class="result-value positive">{formatCurrency(performance().dividendIncomeValue)}</span>
                            </div>
                            <div class="result-row">
                                <span>Capital Gains %</span>
                                <span class="result-value positive">{formatPercent(performance().capitalGainsPercent)}</span>
                            </div>
                            <div class="result-row">
                                <span>Dividend Return %</span>
                                <span class="result-value positive">{formatPercent(performance().dividendReturnPercent)}</span>
                            </div>
                            <div class="result-row">
                                <span>Best Performing Stock</span>
                                <span class="result-value positive">
                                    {performance().bestPerformingStock ? `${performance().bestPerformingStock.symbol} (${formatPercent(performance().bestPerformingStock.returnPercent)})` : ''}
                                </span>
                            </div>
                            <div class="result-row">
                                <span>Monthly Income</span>
                                <span class="result-value positive">{formatCurrency(performance().monthlyIncome)}</span>
                            </div>
                            <div class="result-row">
                                <span>Annual Projected Income</span>
                                <span class="result-value positive">{formatCurrency(performance().annualProjectedIncome)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Risk Analysis Tab */}
                <div id="riskAnalysis-subtab" class={`sub-tab-content ${activeSubTab() === 'riskAnalysis' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">⚠️ Risk Metrics</div>
                        <div class="results-grid">
                            <div class="result-row">
                                <span>Portfolio Concentration</span>
                                 <span class="result-value">{risk().portfolioConcentration}</span>
                            </div>
                            <div class="result-row">
                                <span>Largest Position Weight</span>
                                 <span class="result-value">{risk().largestPositionWeight}</span>
                            </div>
                            <div class="result-row">
                                <span>Sector Concentration</span>
                                <span class="result-value">{risk().sectorConcentration}</span>
                            </div>
                            <div class="result-row">
                                <span>Geographic Exposure</span>
                                <span class="result-value">{risk().geographicExposure}</span>
                            </div>
                            <div class="result-row">
                                <span>Dividend Dependency</span>
                                <span class="result-value positive">{risk().dividendDependency}</span>
                            </div>
                            <div class="result-row">
                                <span>Yield Stability</span>
                                <span class="result-value positive">{risk().yieldStability}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="allocationAnalysis-subtab" class={`sub-tab-content ${activeSubTab() === 'allocationAnalysis' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📋 Asset Allocation</div>
                        <div class="results-grid">
                            <For each={Object.entries(allocation().assetWeights || {})}>
                                {([sym, weight]) => (
                                    <div class="result-row">
                                        <span>{sym} Weight</span>
                                        <span class="result-value">{formatPercent(weight)}</span>
                                    </div>
                                )}
                            </For>
                            <For each={Object.entries(allocation().sectorWeights || {})}>
                                {([sector, weight]) => (
                                    <div class="result-row">
                                        <span>{sector} Sector</span>
                                        <span class="result-value">{formatPercent(weight)}</span>
                                    </div>
                                )}
                            </For>
                            <div class="result-row">
                                <span>High Yield Assets</span>
                                <span class="result-value positive">{formatPercent(allocation().highYieldAssetsPercent)}</span>
                            </div>
                            <div class="result-row">
                                <span>Growth Assets</span>
                                <span class="result-value positive">{formatPercent(allocation().growthAssetsPercent)}</span>
                            </div>
                            <div class="result-row">
                                <span>Average Yield</span>
                                <span class="result-value positive">{formatPercent(allocation().averageYieldPercent)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PortfolioAnalysisTab;