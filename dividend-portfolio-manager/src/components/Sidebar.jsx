import { For } from 'solid-js';

function Sidebar(props) {
 const navItems = [
    { icon: '📊', background: '#f59e0b', label: 'Portfolio Holdings', id: 'holdings' },
    { icon: '💰', background: '#f59e0b', label: 'Portfolio Analysis', id: 'portfolioAnalysis' }, // Updated
    { icon: '📈', background: '#3b82f6', label: 'Backtesting Analytics', id: 'backtest' }
];

    return (
        <div class="sidebar">
            <For each={navItems}>
                {item => (
                    <div
                        class={`nav-item ${props.activeTab() === item.id ? 'active' : ''}`}
                        onClick={() => props.setActiveTab(item.id)}
                    >
                        <div class="nav-icon" style={{ background: item.background }}>{item.icon}</div>
                        {item.label}
                    </div>
                )}
            </For>
        </div>
    );
}

export default Sidebar;