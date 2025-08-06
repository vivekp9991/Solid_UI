import { createSignal, For } from 'solid-js';

function PortfolioAnalysisTab(props) {
    const [activeSubTab, setActiveSubTab] = createSignal('portfolioMetrics');

    const subTabs = [
        { id: 'portfolioMetrics', icon: '📊', label: 'Portfolio Metrics' },
        { id: 'dividendAnalysis', icon: '💰', label: 'Dividend Analysis' },
        { id: 'performanceBreakdown', icon: '📈', label: 'Performance Breakdown' },
        { id: 'riskAnalysis', icon: '⚠️', label: 'Risk Analysis' },
        { id: 'allocationAnalysis', icon: '📋', label: 'Allocation Analysis' }
    ];

    return (
        <div id="portfolioAnalysis-tab">
            <div class="content-header">
                <h2 class="content-title">Portfolio Analysis</h2>
            </div>
            <div class="backtest-section">
                {/* Green highlighted section - Portfolio Analysis Cards */}
                <div class="portfolio-analysis-cards">
                    <div class="analysis-card current-gain">
                        <div class="analysis-header">
                            <div class="analysis-icon">📊</div>
                            <span>Current Gain</span>
                        </div>
                        <div class="analysis-value positive">+15.39%</div>
                        <div class="analysis-subtitle">Current monthly</div>
                    </div>
                    
                    <div class="analysis-card dividends">
                        <div class="analysis-header">
                            <div class="analysis-icon">💰</div>
                            <span>Dividends</span>
                        </div>
                        <div class="analysis-value">7.13%</div>
                        <div class="analysis-subtitle">Real-time calculation</div>
                    </div>
                    
                    <div class="analysis-card total-returns">
                        <div class="analysis-header">
                            <div class="analysis-icon">💎</div>
                            <span>Total Returns</span>
                        </div>
                        <div class="analysis-value">$623.55</div>
                        <div class="analysis-subtitle">All time received</div>
                    </div>
                </div>

                {/* Sub-tabs Navigation */}
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

                {/* Portfolio Metrics Tab */}
                <div id="portfolioMetrics-subtab" class={`sub-tab-content ${activeSubTab() === 'portfolioMetrics' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📊 Portfolio Overview</div>
                        <div class="results-grid">
                            <div class="result-row">
                                <span>Total Investment</span>
                                <span class="result-value">$12,409.90</span>
                            </div>
                            <div class="result-row">
                                <span>Current Value</span>
                                <span class="result-value">$14,330.977</span>
                            </div>
                            <div class="result-row">
                                <span>Total Return</span>
                                <span class="result-value positive">$2,544.627</span>
                            </div>
                            <div class="result-row">
                                <span>Return Percentage</span>
                                <span class="result-value positive">20.51%</span>
                            </div>
                            <div class="result-row">
                                <span>Number of Positions</span>
                                <span class="result-value">2</span>
                            </div>
                            <div class="result-row">
                                <span>Average Position Size</span>
                                <span class="result-value">$6,204.95</span>
                            </div>
                            <div class="result-row">
                                <span>Largest Position</span>
                                <span class="result-value">$9,230.00 (AAPL)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dividend Analysis Tab */}
                <div id="dividendAnalysis-subtab" class={`sub-tab-content ${activeSubTab() === 'dividendAnalysis' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📋 Dividend Analysis</div>
                        <div class="results-grid">
                            <div class="result-row">
                                <span>Current Yield</span>
                                <span class="result-value positive">11.95%</span>
                            </div>
                            <div class="result-row">
                                <span>Yield on Cost</span>
                                <span class="result-value positive">12.48%</span>
                            </div>
                            <div class="result-row">
                                <span>Div Adj. Avg Cost</span>
                                <span class="result-value" style="color: #8b5cf6;">$11.98</span>
                            </div>
                            <div class="result-row">
                                <span>Div Adj. Yield</span>
                                <span class="result-value positive">15.57%</span>
                            </div>
                            <div class="result-row">
                                <span>TTM Yield</span>
                                <span class="result-value positive">12.45%</span>
                            </div>
                            <div class="result-row">
                                <span>Monthly Average</span>
                                <span class="result-value positive">$25.37</span>
                            </div>
                            <div class="result-row">
                                <span>Annual Projected</span>
                                <span class="result-value positive">$612.72</span>
                            </div>
                        </div>
                        
                        <div class="strategy-note">Dividend Impact on Cost</div>
                        <div class="strategy-note" style="margin-top: 0.5rem; color: #8b5cf6;">
                            Effective Cost: $4,910.55 - $479.55 = $4,431.00<br />
                            Div Adj. Cost/Share: $4,431.00 ÷ 370 = $11.98
                        </div>
                    </div>
                </div>

                {/* Performance Breakdown Tab */}
                <div id="performanceBreakdown-subtab" class={`sub-tab-content ${activeSubTab() === 'performanceBreakdown' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📈 Performance Analysis</div>
                        <div class="results-grid">
                            <div class="result-row">
                                <span>Capital Gains</span>
                                <span class="result-value positive">$1,921.077</span>
                            </div>
                            <div class="result-row">
                                <span>Dividend Income</span>
                                <span class="result-value positive">$623.55</span>
                            </div>
                            <div class="result-row">
                                <span>Capital Gains %</span>
                                <span class="result-value positive">15.47%</span>
                            </div>
                            <div class="result-row">
                                <span>Dividend Return %</span>
                                <span class="result-value positive">5.02%</span>
                            </div>
                            <div class="result-row">
                                <span>Best Performing Stock</span>
                                <span class="result-value positive">AAPL (+26.58%)</span>
                            </div>
                            <div class="result-row">
                                <span>Monthly Income</span>
                                <span class="result-value positive">$99.80</span>
                            </div>
                            <div class="result-row">
                                <span>Annual Projected Income</span>
                                <span class="result-value positive">$1,197.60</span>
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
                                <span class="result-value">High (2 positions)</span>
                            </div>
                            <div class="result-row">
                                <span>Largest Position Weight</span>
                                <span class="result-value">64.4% (AAPL)</span>
                            </div>
                            <div class="result-row">
                                <span>Sector Concentration</span>
                                <span class="result-value">Technology: 64.4%</span>
                            </div>
                            <div class="result-row">
                                <span>Geographic Exposure</span>
                                <span class="result-value">Canada: 35.6%, US: 64.4%</span>
                            </div>
                            <div class="result-row">
                                <span>Dividend Dependency</span>
                                <span class="result-value positive">24.5% of returns</span>
                            </div>
                            <div class="result-row">
                                <span>Yield Stability</span>
                                <span class="result-value positive">Stable (avg 7.13%)</span>
                            </div>
                        </div>
                        <div class="strategy-note">⚠️ Portfolio shows high concentration risk with only 2 positions</div>
                    </div>
                </div>

                {/* Allocation Analysis Tab */}
                <div id="allocationAnalysis-subtab" class={`sub-tab-content ${activeSubTab() === 'allocationAnalysis' ? '' : 'hidden'}`}>
                    <div class="results-card">
                        <div class="results-header">📋 Asset Allocation</div>
                        <div class="results-grid">
                            <div class="result-row">
                                <span>AAPL Weight</span>
                                <span class="result-value">64.4% ($9,230.00)</span>
                            </div>
                            <div class="result-row">
                                <span>HYLD.TO Weight</span>
                                <span class="result-value">35.6% ($5,102.30)</span>
                            </div>
                            <div class="result-row">
                                <span>Technology Sector</span>
                                <span class="result-value">64.4%</span>
                            </div>
                            <div class="result-row">
                                <span>Dividend ETF Sector</span>
                                <span class="result-value">35.6%</span>
                            </div>
                            <div class="result-row">
                                <span>High Yield Assets</span>
                                <span class="result-value positive">35.6% (>10% yield)</span>
                            </div>
                            <div class="result-row">
                                <span>Growth Assets</span>
                                <span class="result-value positive">64.4% (AAPL)</span>
                            </div>
                            <div class="result-row">
                                <span>Average Yield</span>
                                <span class="result-value positive">7.13%</span>
                            </div>
                        </div>
                        <div class="strategy-note">📊 Balanced mix of growth and dividend income assets</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PortfolioAnalysisTab;