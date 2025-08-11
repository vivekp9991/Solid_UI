// src/components/AccountDetailsModal.jsx - FIXED VERSION
import { createSignal, For, Show, createEffect } from 'solid-js';

function AccountDetailsModal(props) {
    // FIXED: Debug modal props
    createEffect(() => {
        console.log('🔍 Modal props changed:', {
            isOpen: props.isOpen,
            stock: props.stock?.symbol || 'none',
            hasOnClose: typeof props.onClose === 'function'
        });
    });

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
            // FIXED: Handle both formatted and raw price values
            const priceStr = pos.avgCost || '$0.00';
            const price = Number(priceStr.toString().replace(/[$,]/g, '')) || 0;
            return sum + (shares * price);
        }, 0);
        return formatCurrency(total);
    };

    const handleOverlayClick = (e) => {
        console.log('🖱️ Overlay clicked');
        if (e.target === e.currentTarget) {
            console.log('✅ Closing modal via overlay click');
            props.onClose?.();
        }
    };

    const handleCloseClick = (e) => {
        console.log('🖱️ Close button clicked');
        e.preventDefault();
        e.stopPropagation();
        props.onClose?.();
    };

    // FIXED: Add escape key handler
    createEffect(() => {
        if (props.isOpen) {
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    console.log('⌨️ Escape key pressed, closing modal');
                    props.onClose?.();
                }
            };
            
            document.addEventListener('keydown', handleEscape);
            // FIXED: Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
            
            return () => {
                document.removeEventListener('keydown', handleEscape);
                document.body.style.overflow = '';
            };
        }
    });

    // FIXED: Don't render anything if not open or no stock
    if (!props.isOpen || !props.stock) {
        return null;
    }

    return (
        <div class="modal-overlay" onClick={handleOverlayClick}>
            <div class="modal-container" onClick={(e) => e.stopPropagation()}>
                <div class="modal-header">
                    <div class="modal-title-section">
                        <div class="stock-symbol-badge">{props.stock.symbol}</div>
                        <h2 class="modal-title">Account Details</h2>
                    </div>
                    <button class="modal-close-btn" onClick={handleCloseClick} type="button">×</button>
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
                        <Show when={props.stock.individualPositions?.length > 0} fallback={
                            <div class="empty-state">
                                <div class="empty-icon">🏦</div>
                                <div class="empty-title">No Account Details</div>
                                <div class="empty-subtitle">Individual position data not available</div>
                            </div>
                        }>
                            <For each={props.stock.individualPositions || []}>
                                {(position, index) => (
                                    <div class="account-card">
                                        <div class="account-header">
                                            <div class="account-badge">
                                                <span class="account-type-indicator">
                                                    {position.accountType === 'TFSA' ? '🔒' : 
                                                     position.accountType === 'FHSA' ? '🏠' : 
                                                     position.accountType === 'RRSP' ? '📈' :
                                                     position.accountType === 'Cash' ? '💰' : '📊'}
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
                                                <span class="detail-value">{position.avgCost || '$0.00'}</span>
                                            </div>
                                            <div class="detail-item">
                                                <span class="detail-label">Market Value</span>
                                                <span class="detail-value success">{position.marketValue || '$0.00'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </Show>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="modal-action-btn secondary" onClick={handleCloseClick} type="button">
                        Close
                    </button>
                    <button class="modal-action-btn primary" type="button">
                        📊 View Details
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AccountDetailsModal;