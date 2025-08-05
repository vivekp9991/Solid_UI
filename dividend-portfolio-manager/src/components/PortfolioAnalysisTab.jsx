import { For } from 'solid-js';

function PortfolioAnalysisTab(props) {
    return (
        <div id="portfolioAnalysis-tab">
            <div class="content-header">
                <h2 class="content-title">Portfolio Analysis</h2>
            </div>
            <div class="dividend-cards">
                <For each={props.dividendCardsData}>
                    {card => (
                        <div class="dividend-card">
                            <div class="dividend-card-header">
                                <div class="stat-icon" style={{ background: card.background }}>{card.icon}</div>
                                {card.title}
                            </div>
                            <div class="dividend-card-value">{card.value}</div>
                            <div class="dividend-card-subtitle">{card.subtitle}</div>
                        </div>
                    )}
                </For>
            </div>
            <div class="portfolio-summary">
                <For each={props.portfolioSummaryData}>
                    {card => (
                        <div class="summary-card">
                            <h3>{card.title}</h3>
                            <For each={card.rows}>
                                {row => (
                                    <div class="summary-row">
                                        <span>{row.label}</span>
                                        <span class={row.positive ? 'positive' : ''}>{row.value}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                    )}
                </For>
            </div>
            <div class="results-card">
                <div class="results-header">📋 Dividend Analysis</div>
                <div class="results-grid">
                    <For each={props.portfolioDividendMetrics}>
                        {row => (
                            <div class="result-row">
                                <span>{row.label}</span>
                                <span class={row.positive ? 'result-value positive' : 'result-value'}>{row.value}</span>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
}

export default PortfolioAnalysisTab;