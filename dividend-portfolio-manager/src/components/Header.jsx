function Header(props) {
    return (
        <div class="header">
            <div class="logo-section">
                <div class="logo">📊</div>
                <div class="title-section">
                    <h1>Dividend Portfolio Manager</h1>
                    <p>Advanced dividend tracking & backtesting platform</p>
                </div>
            </div>
            <div class="header-actions">
                <div class="live-indicator">
                    <div class="live-dot"></div>
                    Live
                </div>
               <div class="quest-wrapper">
                    <button class="refresh-btn" onClick={props.runQuestrade}>Questrade</button>
                    <div class="last-run">
                        Last run: {props.lastRun() || 'Never'}
                        {/* <button class="refresh-btn small" onClick={props.runQuestrade}>Refresh</button> */}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Header;