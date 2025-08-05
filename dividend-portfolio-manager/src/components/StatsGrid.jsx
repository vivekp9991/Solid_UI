import { For } from 'solid-js';

function StatsGrid(props) {
    return (
        <div class="stats-grid">
            <For each={props.stats}>
                {stat => (
                    <div class="stat-card">
                        <div class="stat-header">
                            <div class="stat-icon" style={{ background: stat.background }}>{stat.icon}</div>
                            {stat.title}
                        </div>
                        <div class={stat.positive ? 'stat-value positive' : 'stat-value'}>{stat.value}</div>
                        <div class={stat.positive ? 'stat-subtitle positive' : 'stat-subtitle'}>{stat.subtitle}</div>
                    </div>
                )}
            </For>
        </div>
    );
}

export default StatsGrid;