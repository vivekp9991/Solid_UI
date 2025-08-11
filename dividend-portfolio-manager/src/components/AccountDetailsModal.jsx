// src/components/AccountDetailsModal.jsx
import { createSignal, For, Show } from 'solid-js';

function AccountDetailsModal(props) {
    const formatCurrency = (num) => {
        const n = Number(num);
        return isNaN(n) ? '$0.00' : `$${n.toFixed(2)}`;
    };

    const formatShares = (num) => {
        const n = Number(num);
        return isNaN(n) ? '0' : n.toLocaleString();
    };

    const getTotalShares = () => {
        if (!props.stock?.individualPositions) return '0';
        return props.stock.individualPositions.reduce((sum, pos) => {
            return sum + (Number(pos.shares) || 0);
        }, 0).toLocaleString();
    };

    const getTotalValue = () => {
        if (!props.stock?.individualPositions) return '$0.00';
        const total = props.stock.individualPositions.reduce((sum, pos) => {
            const shares = Number(pos.shares) || 0;
            const price = Number(pos.avgCost?.replace(/[$,]/g, '')) || 0;
            return sum + (shares * price);
        }, 0);
        return formatCurrency(total);
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            props.onClose();
        }
    };

    return (
        <Show when={props.isOpen && props.stock}>
            <div class="modal-overlay" onClick={handleOverlayClick}>
                <div class="modal-container">
                    <div class="modal-header">
                        <div class="modal-title-section">
                            <div class="stock-symbol-badge">{props.stock.symbol}</div>
                            <h2 class="modal-title">Account Details</h2>
                        </div>
                        <button class="modal-close-btn" onClick={props.onClose}>×</button>
                    </div>

                    <div class="modal-content">
                        {/* Summary Section */}
                        <div class="summary-section">
                            <div class="summary-item">
                                <span class="summary-label">Total Shares</span>
                                <span class="summary-value">{getTotalShares()}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Total Accounts</span>
                                <span class="summary-value">{props.stock.individualPositions?.length || 0}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Combined Value</span>
                                <span class="summary-value success">{getTotalValue()}</span>
                            </div>
                        </div>

                        {/* Individual Accounts */}
                        <div class="accounts-section">
                            <For each={props.stock.individualPositions || []}>
                                {(position, index) => (
                                    <div class="account-card">
                                        <div class="account-header">
                                            <div class="account-badge">
                                                <span class="account-type-indicator">
                                                    {position.accountType === 'TFSA' ? '🔒' : 
                                                     position.accountType === 'FHSA' ? '🏠' : '📊'}
                                                </span>
                                                <span class="account-type">{position.accountType || 'UNKNOWN'}</span>
                                            </div>
                                            <div class="account-number">
                                                Account {position.accountName || `#${index() + 1}`}
                                            </div>
                                        </div>
                                        
                                        <div class="account-details">
                                            <div class="detail-item">
                                                <span class="detail-label">Shares</span>
                                                <span class="detail-value">{formatShares(position.shares)} shares</span>
                                            </div>
                                            <div class="detail-item">
                                                <span class="detail-label">Avg Cost</span>
                                                <span class="detail-value">{position.avgCost}</span>
                                            </div>
                                            <div class="detail-item">
                                                <span class="detail-label">Market Value</span>
                                                <span class="detail-value success">{position.marketValue}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="modal-action-btn secondary" onClick={props.onClose}>
                            Close
                        </button>
                        <button class="modal-action-btn primary">
                            📊 View Details
                        </button>
                    </div>
                </div>
            </div>
        </Show>
    );
}

export default AccountDetailsModal;