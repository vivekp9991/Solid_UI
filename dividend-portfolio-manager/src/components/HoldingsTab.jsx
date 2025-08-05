import { createSignal, createEffect, For } from 'solid-js';

function HoldingsTab(props) {
    const [searchTerm, setSearchTerm] = createSignal('');
    const [showColumns, setShowColumns] = createSignal(false);
    const [columnVisibility, setColumnVisibility] = createSignal({
        shares: true,
        'avg-cost': true,
        current: true,
        'total-return': true,
        'current-yield': true,
        'market-value': true,
        'capital-growth': false,
        'dividend-return': false,
        'div-adj-cost': false,
        'div-adj-yield': false,
        'monthly-div': false,
        'value-wo-div': false
    });
    const [sortColumn, setSortColumn] = createSignal(0);
    const [sortDirection, setSortDirection] = createSignal('asc');
    const [filteredStocks, setFilteredStocks] = createSignal(props.stockData);

    const columns = [
        { id: 'shares', label: 'SHARES' },
        { id: 'avg-cost', label: 'AVG COST' },
        { id: 'current', label: 'CURRENT' },
        { id: 'total-return', label: 'TOTAL RETURN' },
        { id: 'current-yield', label: 'CURRENT YIELD' },
        { id: 'market-value', label: 'MARKET VALUE' },
        { id: 'capital-growth', label: 'CAPITAL GROWTH' },
        { id: 'dividend-return', label: 'DIVIDEND RETURN' },
        { id: 'div-adj-cost', label: 'DIV ADJ COST' },
        { id: 'div-adj-yield', label: 'DIV ADJ YIELD' },
        { id: 'monthly-div', label: 'MONTHLY DIV' },
        { id: 'value-wo-div', label: 'VALUE W/O DIV' }
    ];

    createEffect(() => {
        const term = searchTerm().toLowerCase();
        setFilteredStocks(
            props.stockData.filter(stock =>
                stock.symbol.toLowerCase().includes(term) ||
                stock.company.toLowerCase().includes(term)
            )
        );
    });

    const toggleColumn = (column) => {
        setColumnVisibility(prev => ({
            ...prev,
            [column]: !prev[column]
        }));
    };

    const sortTable = (columnIndex) => {
        const currentDir = sortColumn() === columnIndex ? sortDirection() : 'asc';
        const newDir = currentDir === 'asc' ? 'desc' : 'asc';
        setSortColumn(columnIndex);
        setSortDirection(newDir);

        setFilteredStocks(prev => {
            const sorted = [...prev];
            sorted.sort((a, b) => {
                const keys = ['symbol', 'shares', 'avgCost', 'current', 'totalReturn', 'currentYield', 'marketValue',
                    'capitalGrowth', 'dividendReturn', 'divAdjCost', 'divAdjYield', 'monthlyDiv', 'valueWoDiv'];
                let aValue = a[keys[columnIndex]];
                let bValue = b[keys[columnIndex]];

                if (aValue.includes('$') || aValue.includes('%')) {
                    aValue = parseFloat(aValue.replace(/[\$,%+]/g, '')) || 0;
                    bValue = parseFloat(bValue.replace(/[\$,%+]/g, '')) || 0;
                    return newDir === 'asc' ? aValue - bValue : bValue - aValue;
                }

                return newDir === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            });
            return sorted;
        });
    };

    return (
        <div id="holdings-tab">
            <div class="content-header">
                <h2 class="content-title">Portfolio Holdings</h2>
                <div class="header-controls">
                    <div class="search-box">
                        <input
                            type="text"
                            placeholder="Search stocks..."
                            value={searchTerm()}
                            onInput={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div class="auto-refresh">Auto-refresh: 5s</div>
                    <button class="columns-btn" onClick={() => setShowColumns(!showColumns())}>🔧 Columns</button>
                    <button class="export-btn">📤 Export</button>
                </div>
            </div>
            <div class={`column-settings ${showColumns() ? '' : 'hidden'}`}>
                <div class="column-settings-header">
                    <h3>Column Settings</h3>
                    <button class="close-btn" onClick={() => setShowColumns(false)}>✕</button>
                </div>
                <div class="column-checkboxes">
                    <For each={columns}>
                        {col => (
                            <label>
                                <input
                                    type="checkbox"
                                    checked={columnVisibility()[col.id]}
                                    onChange={() => toggleColumn(col.id)}
                                />
                                {col.label}
                            </label>
                        )}
                    </For>
                </div>
            </div>
            <div class="table-container">
                <table class="holdings-table">
                    <thead>
                        <tr>
                            <th data-column="0" onClick={() => sortTable(0)}>STOCK <span class="sort-indicator">{sortColumn() === 0 ? (sortDirection() === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                            <For each={columns}>
                                {col => (
                                    <th
                                        data-column={columns.indexOf(col) + 1}
                                        class={`col-${col.id} ${columnVisibility()[col.id] ? '' : 'hidden'}`}
                                        onClick={() => sortTable(columns.indexOf(col) + 1)}
                                    >
                                        {col.label} <span class="sort-indicator">{sortColumn() === columns.indexOf(col) + 1 ? (sortDirection() === 'asc' ? '↑' : '↓') : '↕'}</span>
                                    </th>
                                )}
                            </For>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <For each={filteredStocks()}>
                            {stock => (
                                <tr class="stock-row">
                                    <td>
                                        <div class="stock-info">
                                            <div class="stock-dot" style={{ background: stock.dotColor }}></div>
                                            <div>
                                                <div class="stock-name">{stock.symbol}</div>
                                                <div class="stock-company">{stock.company}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class={`col-shares ${columnVisibility().shares ? '' : 'hidden'}`}>{stock.shares}</td>
                                    <td class={`col-avg-cost ${columnVisibility()['avg-cost'] ? '' : 'hidden'}`}>{stock.avgCost}</td>
                                    <td class={`col-current ${columnVisibility().current ? '' : 'hidden'}`}>{stock.current}</td>
                                    <td class={`col-total-return ${columnVisibility()['total-return'] ? '' : 'hidden'} positive`}>{stock.totalReturn}</td>
                                    <td class={`col-current-yield ${columnVisibility()['current-yield'] ? '' : 'hidden'} positive`}>{stock.currentYield}</td>
                                    <td class={`col-market-value ${columnVisibility()['market-value'] ? '' : 'hidden'}`}>{stock.marketValue}</td>
                                    <td class={`col-capital-growth ${columnVisibility()['capital-growth'] ? '' : 'hidden'} positive`}>{stock.capitalGrowth}</td>
                                    <td class={`col-dividend-return ${columnVisibility()['dividend-return'] ? '' : 'hidden'} positive`}>{stock.dividendReturn}</td>
                                    <td class={`col-div-adj-cost ${columnVisibility()['div-adj-cost'] ? '' : 'hidden'}`} style={{ color: '#8b5cf6' }}>{stock.divAdjCost}</td>
                                    <td class={`col-div-adj-yield ${columnVisibility()['div-adj-yield'] ? '' : 'hidden'} positive`}>{stock.divAdjYield}</td>
                                    <td class={`col-monthly-div ${columnVisibility()['monthly-div'] ? '' : 'hidden'}`}>{stock.monthlyDiv}</td>
                                    <td class={`col-value-wo-div ${columnVisibility()['value-wo-div'] ? '' : 'hidden'}`}>{stock.valueWoDiv}</td>
                                    <td>...</td>
                                </tr>
                            )}
                        </For>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default HoldingsTab;