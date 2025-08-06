import { For } from 'solid-js';

function StatsGrid(props) {
    return (
        <div class="stats-grid">
            <For each={props.stats}>
                {stat => (
                    <div class="stat-card">
                        <div class="stat-header">
                            <div class="stat-info">
                                <div class="stat-icon" style={{ background: `linear-gradient(135deg, ${stat.background}, ${stat.background}dd)` }}>
                                    {stat.icon}
                                </div>
                                <div class="stat-title">{stat.title}</div>
                            </div>
                            <div class="sparkline"></div>
                        </div>
                        <div class={stat.positive ? 'stat-value positive' : 'stat-value'}>{stat.value}</div>
                        <div class={stat.positive ? 'stat-subtitle positive' : 'stat-subtitle'}>{stat.subtitle}</div>
                        {stat.positive && (
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 75%"></div>
                            </div>
                        )}
                    </div>
                )}
            </For>
        </div>
    );
}

export default StatsGrid;