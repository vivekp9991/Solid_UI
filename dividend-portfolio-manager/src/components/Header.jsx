function Header() {
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
                <button class="add-position-btn">+ Add Position</button>
            </div>
        </div>
    );
}

export default Header;