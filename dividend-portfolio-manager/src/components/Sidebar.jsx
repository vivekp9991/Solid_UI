// dividend-portfolio-manager/src/components/Sidebar.jsx
import { For, createSignal } from 'solid-js';

function Sidebar(props) {
    const [isCollapsed, setIsCollapsed] = createSignal(false);
    
    const navItems = [
        { icon: '📊', background: '#f59e0b', label: 'Portfolio Holdings', id: 'holdings' },
        { icon: '💰', background: '#f59e0b', label: 'Portfolio Analysis', id: 'portfolioAnalysis' },
        { icon: '📈', background: '#3b82f6', label: 'Backtesting Analytics', id: 'backtest' }
    ];

    return (
        <div class={`sidebar ${isCollapsed() ? 'collapsed' : ''}`}>
            <div class="sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed())}>
                {isCollapsed() ? '☰' : '✕'}
            </div>
            <For each={navItems}>
                {item => (
                    <div
                        class={`nav-item ${props.activeTab() === item.id ? 'active' : ''}`}
                        onClick={() => {
                            props.setActiveTab(item.id);
                            setIsCollapsed(true); // Auto-collapse after selection
                        }}
                        title={isCollapsed() ? item.label : ''}
                    >
                        <div class="nav-icon" style={{ background: item.background }}>{item.icon}</div>
                        {!isCollapsed() && <span class="nav-label">{item.label}</span>}
                    </div>
                )}
            </For>
        </div>
    );
}

export default Sidebar;