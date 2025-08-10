// src/components/Header.jsx
import AccountSelector from './AccountSelector';

function Header(props) {
    const handleSyncClick = () => {
        if (!props.isLoading()) {
            props.runQuestrade();
        }
    };

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
                {/* Account Selection Dropdown */}
                <div class="account-selection">
                    <AccountSelector
                        selectedAccount={props.selectedAccount}
                        onAccountChange={props.onAccountChange}
                        disabled={props.isLoading()}
                    />
                </div>
                
                <div class="live-indicator">
                    <div class="live-dot"></div>
                    Live
                </div>
                
                <div class="quest-wrapper">
                    <button 
                        class="refresh-btn" 
                        onClick={handleSyncClick}
                        disabled={props.isLoading()}
                        style={{
                            opacity: props.isLoading() ? '0.6' : '1',
                            cursor: props.isLoading() ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {props.isLoading() ? 'Syncing...' : 'Sync Data'}
                    </button>
                    <div class="last-run">
                        Last run: {props.lastRun() || 'Never'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Header;