// src/components/SettingsTab.jsx - ENHANCED: Added Portfolio Settings with Toggle
import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import { 
    fetchPersons, 
    createPerson, 
    updatePerson, 
    deletePerson,
    setupPersonToken,
    refreshPersonToken,
    getTokenStatus,
    testConnection,
    deleteToken,
    fetchSettingsDashboard,
    validateToken,
    getErrorLogs,
    clearErrors,
    syncPerson,
    syncAllPersons,
    getSyncStatus,
    getPortfolioSettings,
    updatePortfolioSettings
} from '../api';

function SettingsTab() {
    const [activeSubTab, setActiveSubTab] = createSignal('personManagement');
    const [persons, setPersons] = createSignal([]);
    const [tokenStatuses, setTokenStatuses] = createSignal({});
    const [syncStatuses, setSyncStatuses] = createSignal({});
    const [errorLogs, setErrorLogs] = createSignal([]);
    const [dashboardData, setDashboardData] = createSignal({});
    const [isLoading, setIsLoading] = createSignal(false);
    const [apiStatus, setApiStatus] = createSignal({
        persons: false,
        tokens: false,
        sync: false,
        dashboard: false,
        errorLogs: false,
        portfolioSettings: false
    });
    
    // ADDED: Portfolio Settings State
    const [portfolioSettings, setPortfolioSettings] = createSignal({
        yieldOnCostDividendOnly: true, // Default to dividend stocks only
        lastUpdated: null
    });
    
    // Form states
    const [newPersonForm, setNewPersonForm] = createSignal({
        personName: '',
        refreshToken: '',
        showToken: false
    });
    const [editingPerson, setEditingPerson] = createSignal(null);
    const [notifications, setNotifications] = createSignal([]);

    // ENHANCED: Updated sub-tabs to include Portfolio Settings
    const subTabs = [
        { id: 'personManagement', icon: '👥', label: 'Person Management' },
        { id: 'portfolioSettings', icon: '⚙️', label: 'Portfolio Settings' },
        { id: 'tokenManagement', icon: '🔑', label: 'Token Management' },
        { id: 'dataSync', icon: '🔄', label: 'Data Synchronization' },
        { id: 'systemHealth', icon: '❤️', label: 'System Health' },
        { id: 'errorLogs', icon: '📋', label: 'Error Logs' }
    ];

    // ADDED: Portfolio Settings Functions
    const handleYieldOnCostToggle = async () => {
        const currentSetting = portfolioSettings().yieldOnCostDividendOnly;
        const newSetting = !currentSetting;
        
        try {
            setIsLoading(true);
            
            // Check if API is available
            if (apiStatus().portfolioSettings) {
                // Use backend API
                await updatePortfolioSettings({
                    yieldOnCostDividendOnly: newSetting
                });
                
                // Reload settings from backend
                await loadPortfolioSettings();
            } else {
                // Fallback to localStorage
                const updatedSettings = {
                    yieldOnCostDividendOnly: newSetting,
                    lastUpdated: new Date().toISOString()
                };
                
                setPortfolioSettings(updatedSettings);
                localStorage.setItem('portfolioSettings', JSON.stringify(updatedSettings));
            }
            
            showNotification(
                `Yield on Cost calculation ${newSetting ? 'limited to dividend stocks only' : 'includes all stocks'}`, 
                'success'
            );
            
        } catch (error) {
            console.error('Failed to update portfolio settings:', error);
            showNotification('Failed to update portfolio settings', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    // ADDED: Load Portfolio Settings
    const loadPortfolioSettings = async () => {
        try {
            if (apiStatus().portfolioSettings) {
                // Try to load from backend API
                const settings = await safeApiCall(
                    () => getPortfolioSettings(), 
                    null, 
                    'portfolioSettings'
                );
                
                if (settings) {
                    setPortfolioSettings({
                        yieldOnCostDividendOnly: settings.yieldOnCostDividendOnly ?? true,
                        lastUpdated: settings.updatedAt || settings.lastUpdated
                    });
                    return;
                }
            }
            
            // Fallback to localStorage
            const saved = localStorage.getItem('portfolioSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                setPortfolioSettings(parsed);
            } else {
                // Set default settings
                const defaultSettings = {
                    yieldOnCostDividendOnly: true,
                    lastUpdated: new Date().toISOString()
                };
                setPortfolioSettings(defaultSettings);
                localStorage.setItem('portfolioSettings', JSON.stringify(defaultSettings));
            }
        } catch (error) {
            console.error('Failed to load portfolio settings:', error);
            // Set default on error
            setPortfolioSettings({
                yieldOnCostDividendOnly: true,
                lastUpdated: null
            });
        }
    };

    // Enhanced API call wrapper with better error handling
    const safeApiCall = async (apiFunction, fallbackValue = null, endpointName = 'unknown') => {
        try {
            const result = await apiFunction();
            setApiStatus(prev => ({ ...prev, [endpointName]: true }));
            return result;
        } catch (error) {
            console.warn(`API endpoint ${endpointName} not available:`, error.message);
            setApiStatus(prev => ({ ...prev, [endpointName]: false }));
            return fallbackValue;
        }
    };

    // Load data with graceful error handling
    const loadAllData = async () => {
        console.log('Loading settings data...');
        setIsLoading(true);
        
        try {
            // Try to load each endpoint individually with fallbacks
            const [personsData, tokenData, syncData, dashData, errorData] = await Promise.all([
                safeApiCall(() => fetchPersons(), [], 'persons'),
                safeApiCall(() => getTokenStatus(), {}, 'tokens'),
                safeApiCall(() => getSyncStatus(), {}, 'sync'),
                safeApiCall(() => fetchSettingsDashboard(), {
                    persons: [],
                    systemStats: {
                        totalPersons: 0,
                        totalAccounts: 0,
                        totalPositions: 0,
                        totalActivities: 0,
                        activeTokens: 0
                    },
                    recentErrors: []
                }, 'dashboard'),
                safeApiCall(() => getErrorLogs({ days: 7 }), { tokenErrors: [], syncErrors: [] }, 'errorLogs')
            ]);

            setPersons(Array.isArray(personsData) ? personsData : []);
            setTokenStatuses(tokenData || {});
            setSyncStatuses(syncData || {});
            setDashboardData(dashData || {});
            setErrorLogs(errorData || { tokenErrors: [], syncErrors: [] });
            
            // Load portfolio settings
            await loadPortfolioSettings();
            
            console.log('Settings data loaded successfully');
            
            // Check API status and show warnings if needed
            const status = apiStatus();
            const failedEndpoints = Object.entries(status).filter(([key, value]) => !value).map(([key]) => key);
            
            if (failedEndpoints.length > 0) {
                showNotification(`Some API endpoints are not available: ${failedEndpoints.join(', ')}. Features may be limited.`, 'warning');
            }
            
        } catch (error) {
            console.error('Failed to load settings data:', error);
            showNotification('Failed to load settings data. Using demo mode.', 'error');
            
            // Set default demo data
            setPersons([]);
            setTokenStatuses({});
            setSyncStatuses({});
            setDashboardData({
                persons: [],
                systemStats: {
                    totalPersons: 0,
                    totalAccounts: 0,
                    totalPositions: 0,
                    totalActivities: 0,
                    activeTokens: 0
                },
                recentErrors: []
            });
            setErrorLogs({ tokenErrors: [], syncErrors: [] });
        } finally {
            setIsLoading(false);
        }
    };

    const showNotification = (message, type = 'info') => {
        const id = Date.now();
        const notification = {
            id,
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        };

        setNotifications(prev => [...prev, notification]);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 10000);
    };

    // Enhanced person creation with better error handling
    const handleCreatePerson = async () => {
        const form = newPersonForm();
        if (!form.personName || !form.refreshToken) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            setIsLoading(true);
            
            // Check if API is available
            if (!apiStatus().persons) {
                showNotification('Person management API is not available. Cannot create person.', 'error');
                return;
            }
            
            await createPerson({
                personName: form.personName,
                refreshToken: form.refreshToken
            });
            
            setNewPersonForm({
                personName: '',
                refreshToken: '',
                showToken: false
            });
            
            await loadAllData();
            showNotification('Person created successfully', 'success');
        } catch (error) {
            console.error('Failed to create person:', error);
            showNotification(error.message || 'Failed to create person', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePerson = async (personName) => {
        if (!confirm(`Are you sure you want to delete ${personName} and all associated data?`)) {
            return;
        }

        try {
            setIsLoading(true);
            
            if (!apiStatus().persons) {
                showNotification('Person management API is not available. Cannot delete person.', 'error');
                return;
            }
            
            await deletePerson(personName);
            await loadAllData();
            showNotification('Person deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete person:', error);
            showNotification(error.message || 'Failed to delete person', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshToken = async (personName) => {
        try {
            setIsLoading(true);
            
            if (!apiStatus().tokens) {
                showNotification('Token management API is not available. Cannot refresh token.', 'error');
                return;
            }
            
            await refreshPersonToken(personName);
            await loadAllData();
            showNotification('Token refreshed successfully', 'success');
        } catch (error) {
            console.error('Failed to refresh token:', error);
            showNotification(error.message || 'Failed to refresh token', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestConnection = async (personName) => {
        try {
            setIsLoading(true);
            
            if (!apiStatus().tokens) {
                showNotification('Token management API is not available. Cannot test connection.', 'error');
                return;
            }
            
            const result = await testConnection(personName);
            showNotification(`Connection test successful for ${personName}`, 'success');
        } catch (error) {
            console.error('Connection test failed:', error);
            showNotification(error.message || 'Connection test failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncPerson = async (personName, fullSync = false) => {
        try {
            setIsLoading(true);
            
            if (!apiStatus().sync) {
                showNotification('Sync API is not available. Cannot sync person.', 'error');
                return;
            }
            
            await syncPerson(personName, fullSync);
            await loadAllData();
            showNotification(`Sync completed for ${personName}`, 'success');
        } catch (error) {
            console.error('Sync failed:', error);
            showNotification(error.message || 'Sync failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncAll = async (fullSync = false) => {
        try {
            setIsLoading(true);
            
            if (!apiStatus().sync) {
                showNotification('Sync API is not available. Cannot sync all persons.', 'error');
                return;
            }
            
            await syncAllPersons(fullSync);
            await loadAllData();
            showNotification('Sync completed for all persons', 'success');
        } catch (error) {
            console.error('Sync all failed:', error);
            showNotification(error.message || 'Sync all failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearErrors = async (personName) => {
        try {
            if (!apiStatus().errorLogs) {
                showNotification('Error logs API is not available. Cannot clear errors.', 'error');
                return;
            }
            
            await clearErrors(personName);
            await loadAllData();
            showNotification(`Errors cleared for ${personName}`, 'success');
        } catch (error) {
            console.error('Failed to clear errors:', error);
            showNotification(error.message || 'Failed to clear errors', 'error');
        }
    };

    const getTokenStatusColor = (status) => {
        if (!status) return '#6b7280';
        if (status.valid && !status.expiringSoon) return '#10b981';
        if (status.valid && status.expiringSoon) return '#f59e0b';
        return '#ef4444';
    };

    const getTokenStatusText = (status) => {
        if (!status) return 'Unknown';
        if (!status.valid) return 'Invalid';
        if (status.expiringSoon) return 'Expiring Soon';
        return 'Valid';
    };

    // Load data on mount
    onMount(() => {
        loadAllData();
        
        // Set up periodic refresh every 2 minutes
        const interval = setInterval(loadAllData, 120000);
        return () => clearInterval(interval);
    });

    return (
        <div id="settings-tab">
            <div class="content-header">
                <h2 class="content-title">Settings & Configuration</h2>
                <div class="header-controls">
                    <button class="btn" onClick={loadAllData} disabled={isLoading()}>
                        🔄 Refresh
                    </button>
                    
                    {/* API Status Indicator */}
                    <div class="api-status-indicator">
                        <span class="status-label">API Status:</span>
                        <div class="status-dots">
                            <div 
                                class={`status-dot ${apiStatus().persons ? 'connected' : 'disconnected'}`} 
                                title={`Persons API: ${apiStatus().persons ? 'Connected' : 'Disconnected'}`}
                            ></div>
                            <div 
                                class={`status-dot ${apiStatus().tokens ? 'connected' : 'disconnected'}`} 
                                title={`Tokens API: ${apiStatus().tokens ? 'Connected' : 'Disconnected'}`}
                            ></div>
                            <div 
                                class={`status-dot ${apiStatus().sync ? 'connected' : 'disconnected'}`} 
                                title={`Sync API: ${apiStatus().sync ? 'Connected' : 'Disconnected'}`}
                            ></div>
                            <div 
                                class={`status-dot ${apiStatus().portfolioSettings ? 'connected' : 'disconnected'}`} 
                                title={`Portfolio Settings API: ${apiStatus().portfolioSettings ? 'Connected' : 'Disconnected'}`}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <Show when={notifications().length > 0}>
                <div class="notifications">
                    <For each={notifications()}>
                        {notification => (
                            <div class={`notification notification-${notification.type}`}>
                                {notification.message}
                                <button 
                                    class="notification-close"
                                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </For>
                </div>
            </Show>

            <div class="settings-section">
                <div class="sub-tabs">
                    <For each={subTabs}>
                        {tab => (
                            <div
                                class={`sub-tab ${activeSubTab() === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveSubTab(tab.id)}
                            >
                                {tab.icon} {tab.label}
                            </div>
                        )}
                    </For>
                </div>

                {/* Person Management Tab */}
                <div class={`sub-tab-content ${activeSubTab() === 'personManagement' ? '' : 'hidden'}`}>
                    <Show when={!apiStatus().persons}>
                        <div class="api-warning">
                            <div class="warning-icon">⚠️</div>
                            <div class="warning-text">
                                Person Management API is not available. This feature requires backend implementation.
                                <br />
                                <small>Expected endpoint: <code>/api/persons</code></small>
                            </div>
                        </div>
                    </Show>
                    
                    <div class="settings-card">
                        <div class="settings-header">👥 Add New Person</div>
                        <div class="person-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Person Name</label>
                                    <input
                                        type="text"
                                        value={newPersonForm().personName}
                                        onInput={e => setNewPersonForm(prev => ({ ...prev, personName: e.target.value }))}
                                        placeholder="Enter person name"
                                        disabled={!apiStatus().persons}
                                    />
                                </div>
                                <div class="form-group">
                                    <label>Questrade Refresh Token</label>
                                    <div class="token-input-group">
                                        <input
                                            type={newPersonForm().showToken ? 'text' : 'password'}
                                            value={newPersonForm().refreshToken}
                                            onInput={e => setNewPersonForm(prev => ({ ...prev, refreshToken: e.target.value }))}
                                            placeholder="Enter refresh token"
                                            disabled={!apiStatus().persons}
                                        />
                                        <button
                                            type="button"
                                            class="token-toggle"
                                            onClick={() => setNewPersonForm(prev => ({ ...prev, showToken: !prev.showToken }))}
                                        >
                                            {newPersonForm().showToken ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <button
                                        class="btn btn-primary"
                                        onClick={handleCreatePerson}
                                        disabled={isLoading() || !apiStatus().persons}
                                    >
                                        Add Person
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="settings-card">
                        <div class="settings-header">👥 Existing Persons</div>
                        <div class="persons-list">
                            <Show when={persons().length === 0}>
                                <div class="empty-state">
                                    {apiStatus().persons ? 'No persons configured' : 'Person Management API not available'}
                                </div>
                            </Show>
                            
                            <For each={persons()}>
                                {person => (
                                    <div class="person-card">
                                        <div class="person-info">
                                            <div class="person-name">{person.personName}</div>
                                            <div class="person-details">
                                                <span class="account-count">{person.accountCount || 0} accounts</span>
                                                <span 
                                                    class="token-status"
                                                    style={{ color: getTokenStatusColor(tokenStatuses()[person.personName]) }}
                                                >
                                                    {getTokenStatusText(tokenStatuses()[person.personName])}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="person-actions">
                                            <button
                                                class="btn btn-small"
                                                onClick={() => handleTestConnection(person.personName)}
                                                disabled={isLoading() || !apiStatus().tokens}
                                            >
                                                Test
                                            </button>
                                            <button
                                                class="btn btn-small"
                                                onClick={() => handleSyncPerson(person.personName)}
                                                disabled={isLoading() || !apiStatus().sync}
                                            >
                                                Sync
                                            </button>
                                            <button
                                                class="btn btn-small btn-danger"
                                                onClick={() => handleDeletePerson(person.personName)}
                                                disabled={isLoading() || !apiStatus().persons}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </div>

                {/* ADDED: Portfolio Settings Tab */}
                <div class={`sub-tab-content ${activeSubTab() === 'portfolioSettings' ? '' : 'hidden'}`}>
                    <Show when={!apiStatus().portfolioSettings}>
                        <div class="api-warning">
                            <div class="warning-icon">⚠️</div>
                            <div class="warning-text">
                                Portfolio Settings API is not available. Settings will be stored locally.
                                <br />
                                <small>Expected endpoints: <code>/api/portfolio/settings</code></small>
                            </div>
                        </div>
                    </Show>
                    
                    <div class="settings-card">
                        <div class="settings-header">⚙️ Portfolio Calculation Settings</div>
                        <div class="portfolio-settings">
                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-title">Yield on Cost Calculation</div>
                                    <div class="setting-description">
                                        Choose whether to include only dividend-paying stocks or all stocks in the Yield on Cost calculation.
                                        <br />
                                        <small class="setting-note">
                                            <strong>Dividend Stocks Only:</strong> More accurate representation of dividend yield performance
                                            <br />
                                            <strong>All Stocks:</strong> Shows overall portfolio yield including non-dividend stocks (may lower the percentage)
                                        </small>
                                    </div>
                                </div>
                                <div class="setting-control">
                                    <div class="toggle-setting">
                                        <span class="toggle-label">
                                            {portfolioSettings().yieldOnCostDividendOnly ? 'Dividend Stocks Only' : 'All Stocks'}
                                        </span>
                                        <label class="toggle-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={portfolioSettings().yieldOnCostDividendOnly}
                                                onChange={handleYieldOnCostToggle}
                                                disabled={isLoading()}
                                            />
                                            <span class="slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="setting-divider"></div>
                            
                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-title">Current Calculation Mode</div>
                                    <div class="setting-description">
                                        Your Yield on Cost is currently calculated using{' '}
                                        <strong>
                                            {portfolioSettings().yieldOnCostDividendOnly ? 'dividend-paying stocks only' : 'all stocks in your portfolio'}
                                        </strong>
                                        .
                                    </div>
                                </div>
                                <div class="setting-status">
                                    <div class={`status-indicator ${portfolioSettings().yieldOnCostDividendOnly ? 'dividend-only' : 'all-stocks'}`}>
                                        <div class="status-dot"></div>
                                        <span class="status-text">
                                            {portfolioSettings().yieldOnCostDividendOnly ? 'Dividend Focus' : 'Portfolio Wide'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Show when={portfolioSettings().lastUpdated}>
                                <div class="setting-footer">
                                    <div class="last-updated">
                                        Last updated: {new Date(portfolioSettings().lastUpdated).toLocaleString()}
                                    </div>
                                </div>
                            </Show>
                        </div>
                    </div>

                    <div class="settings-card">
                        <div class="settings-header">📊 Calculation Preview</div>
                        <div class="calculation-preview">
                            <div class="preview-note">
                                <div class="preview-icon">💡</div>
                                <div class="preview-text">
                                    Changes to calculation settings will be reflected in your portfolio statistics after the next data refresh.
                                    The Yield on Cost calculation affects the main dashboard statistic and portfolio analysis.
                                </div>
                            </div>
                            
                            <div class="preview-formula">
                                <div class="formula-title">Current Formula:</div>
                                <div class="formula-text">
                                    Yield on Cost = (Total Annual Dividends ÷ Total Cost Basis) × 100
                                </div>
                                <div class="formula-scope">
                                    <strong>Scope:</strong> {portfolioSettings().yieldOnCostDividendOnly ? 'Dividend-paying stocks only' : 'All stocks in portfolio'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Token Management Tab */}
                <div class={`sub-tab-content ${activeSubTab() === 'tokenManagement' ? '' : 'hidden'}`}>
                    <Show when={!apiStatus().tokens}>
                        <div class="api-warning">
                            <div class="warning-icon">⚠️</div>
                            <div class="warning-text">
                                Token Management API is not available. This feature requires backend implementation.
                                <br />
                                <small>Expected endpoints: <code>/api/auth/token-status</code>, <code>/api/auth/refresh-token</code></small>
                            </div>
                        </div>
                    </Show>
                    
                    <div class="settings-card">
                        <div class="settings-header">🔑 Token Status Dashboard</div>
                        <div class="token-dashboard">
                            <Show when={persons().length === 0}>
                                <div class="empty-state">
                                    {apiStatus().tokens ? 'No persons with tokens found' : 'Token Management API not available'}
                                </div>
                            </Show>
                            
                            <For each={persons()}>
                                {person => {
                                    const status = tokenStatuses()[person.personName];
                                    return (
                                        <div class="token-card">
                                            <div class="token-person">{person.personName}</div>
                                            <div class="token-details">
                                                <div class="token-status-indicator">
                                                    <div 
                                                        class="status-dot"
                                                        style={{ background: getTokenStatusColor(status) }}
                                                    ></div>
                                                    <span>{getTokenStatusText(status)}</span>
                                                </div>
                                                <Show when={status?.expiresAt}>
                                                    <div class="token-expiry">
                                                        Expires: {new Date(status.expiresAt).toLocaleString()}
                                                    </div>
                                                </Show>
                                                <Show when={status?.lastUsed}>
                                                    <div class="token-last-used">
                                                        Last used: {new Date(status.lastUsed).toLocaleString()}
                                                    </div>
                                                </Show>
                                            </div>
                                            <div class="token-actions">
                                                <button
                                                    class="btn btn-small"
                                                    onClick={() => handleRefreshToken(person.personName)}
                                                    disabled={isLoading() || !apiStatus().tokens}
                                                >
                                                    🔄 Refresh
                                                </button>
                                                <button
                                                    class="btn btn-small"
                                                    onClick={() => handleTestConnection(person.personName)}
                                                    disabled={isLoading() || !apiStatus().tokens}
                                                >
                                                    🔍 Test
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>
                    </div>
                </div>

                {/* Data Synchronization Tab */}
                <div class={`sub-tab-content ${activeSubTab() === 'dataSync' ? '' : 'hidden'}`}>
                    <Show when={!apiStatus().sync}>
                        <div class="api-warning">
                            <div class="warning-icon">⚠️</div>
                            <div class="warning-text">
                                Data Synchronization API is not available. This feature requires backend implementation.
                                <br />
                                <small>Expected endpoints: <code>/api/sync/person</code>, <code>/api/sync/all-persons</code></small>
                            </div>
                        </div>
                    </Show>
                    
                    <div class="settings-card">
                        <div class="settings-header">🔄 Data Synchronization</div>
                        
                        <div class="sync-controls">
                            <div class="sync-global">
                                <h4>Global Sync</h4>
                                <div class="sync-buttons">
                                    <button
                                        class="btn btn-primary"
                                        onClick={() => handleSyncAll(false)}
                                        disabled={isLoading() || !apiStatus().sync}
                                    >
                                        🔄 Sync All (Incremental)
                                    </button>
                                    <button
                                        class="btn btn-warning"
                                        onClick={() => handleSyncAll(true)}
                                        disabled={isLoading() || !apiStatus().sync}
                                    >
                                        🔄 Full Sync All
                                    </button>
                                </div>
                            </div>

                            <div class="sync-individual">
                                <h4>Individual Sync</h4>
                                <Show when={persons().length === 0}>
                                    <div class="empty-state">
                                        {apiStatus().sync ? 'No persons available for sync' : 'Sync API not available'}
                                    </div>
                                </Show>
                                
                                <For each={persons()}>
                                    {person => {
                                        const syncStatus = syncStatuses()[person.personName];
                                        return (
                                            <div class="sync-person">
                                                <div class="sync-person-info">
                                                    <div class="sync-person-name">{person.personName}</div>
                                                    <Show when={syncStatus}>
                                                        <div class="sync-status">
                                                            Last sync: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : 'Never'}
                                                        </div>
                                                        <Show when={syncStatus.isRunning}>
                                                            <div class="sync-running">Sync in progress...</div>
                                                        </Show>
                                                    </Show>
                                                </div>
                                                <div class="sync-person-actions">
                                                    <button
                                                        class="btn btn-small"
                                                        onClick={() => handleSyncPerson(person.personName, false)}
                                                        disabled={isLoading() || !apiStatus().sync}
                                                    >
                                                        🔄 Sync
                                                    </button>
                                                    <button
                                                        class="btn btn-small btn-warning"
                                                        onClick={() => handleSyncPerson(person.personName, true)}
                                                        disabled={isLoading() || !apiStatus().sync}
                                                    >
                                                        🔄 Full Sync
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Health Tab */}
                <div class={`sub-tab-content ${activeSubTab() === 'systemHealth' ? '' : 'hidden'}`}>
                    <div class="settings-card">
                        <div class="settings-header">❤️ System Health Dashboard</div>
                        <div class="health-dashboard">
                            <div class="health-stats">
                                <div class="health-stat">
                                    <div class="health-stat-label">Total Persons</div>
                                    <div class="health-stat-value">{dashboardData().systemStats?.totalPersons || 0}</div>
                                </div>
                                <div class="health-stat">
                                    <div class="health-stat-label">Total Accounts</div>
                                    <div class="health-stat-value">{dashboardData().systemStats?.totalAccounts || 0}</div>
                                </div>
                                <div class="health-stat">
                                    <div class="health-stat-label">Total Positions</div>
                                    <div class="health-stat-value">{dashboardData().systemStats?.totalPositions || 0}</div>
                                </div>
                                <div class="health-stat">
                                    <div class="health-stat-label">Active Tokens</div>
                                    <div class="health-stat-value">{dashboardData().systemStats?.activeTokens || 0}</div>
                                </div>
                            </div>

                            <div class="api-endpoints-status">
                                <h4>API Endpoints Status</h4>
                                <div class="endpoints-grid">
                                    <div class={`endpoint-status ${apiStatus().persons ? 'healthy' : 'unhealthy'}`}>
                                        <div class="endpoint-name">Persons API</div>
                                        <div class="endpoint-indicator">
                                            <div class="status-dot"></div>
                                            <span>{apiStatus().persons ? 'Connected' : 'Disconnected'}</span>
                                        </div>
                                    </div>
                                    <div class={`endpoint-status ${apiStatus().tokens ? 'healthy' : 'unhealthy'}`}>
                                        <div class="endpoint-name">Tokens API</div>
                                        <div class="endpoint-indicator">
                                            <div class="status-dot"></div>
                                            <span>{apiStatus().tokens ? 'Connected' : 'Disconnected'}</span>
                                        </div>
                                    </div>
                                    <div class={`endpoint-status ${apiStatus().sync ? 'healthy' : 'unhealthy'}`}>
                                        <div class="endpoint-name">Sync API</div>
                                        <div class="endpoint-indicator">
                                            <div class="status-dot"></div>
                                            <span>{apiStatus().sync ? 'Connected' : 'Disconnected'}</span>
                                        </div>
                                    </div>
                                    <div class={`endpoint-status ${apiStatus().portfolioSettings ? 'healthy' : 'unhealthy'}`}>
                                        <div class="endpoint-name">Portfolio Settings API</div>
                                        <div class="endpoint-indicator">
                                            <div class="status-dot"></div>
                                            <span>{apiStatus().portfolioSettings ? 'Connected' : 'Disconnected'}</span>
                                        </div>
                                    </div>
                                    <div class={`endpoint-status ${apiStatus().dashboard ? 'healthy' : 'unhealthy'}`}>
                                        <div class="endpoint-name">Dashboard API</div>
                                        <div class="endpoint-indicator">
                                            <div class="status-dot"></div>
                                            <span>{apiStatus().dashboard ? 'Connected' : 'Disconnected'}</span>
                                        </div>
                                    </div>
                                    <div class={`endpoint-status ${apiStatus().errorLogs ? 'healthy' : 'unhealthy'}`}>
                                        <div class="endpoint-name">Error Logs API</div>
                                        <div class="endpoint-indicator">
                                            <div class="status-dot"></div>
                                            <span>{apiStatus().errorLogs ? 'Connected' : 'Disconnected'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Logs Tab */}
                <div class={`sub-tab-content ${activeSubTab() === 'errorLogs' ? '' : 'hidden'}`}>
                    <Show when={!apiStatus().errorLogs}>
                        <div class="api-warning">
                            <div class="warning-icon">⚠️</div>
                            <div class="warning-text">
                                Error Logs API is not available. This feature requires backend implementation.
                                <br />
                                <small>Expected endpoint: <code>/api/error-logs</code></small>
                            </div>
                        </div>
                    </Show>
                    
                    <div class="settings-card">
                        <div class="settings-header">📋 Recent Error Logs</div>
                        <div class="error-logs">
                            <div class="error-section">
                                <h4>Token Errors</h4>
                                <Show when={errorLogs().tokenErrors?.length === 0}>
                                    <div class="empty-state">No token errors in the last 7 days</div>
                                </Show>
                                <For each={errorLogs().tokenErrors || []}>
                                    {error => (
                                        <div class="error-item">
                                            <div class="error-timestamp">{new Date(error.timestamp).toLocaleString()}</div>
                                            <div class="error-person">{error.personName}</div>
                                            <div class="error-message">{error.message}</div>
                                            <button
                                                class="btn btn-small"
                                                onClick={() => handleClearErrors(error.personName)}
                                                disabled={isLoading() || !apiStatus().errorLogs}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    )}
                                </For>
                            </div>

                            <div class="error-section">
                                <h4>Sync Errors</h4>
                                <Show when={errorLogs().syncErrors?.length === 0}>
                                    <div class="empty-state">No sync errors in the last 7 days</div>
                                </Show>
                                <For each={errorLogs().syncErrors || []}>
                                    {error => (
                                        <div class="error-item">
                                            <div class="error-timestamp">{new Date(error.timestamp).toLocaleString()}</div>
                                            <div class="error-person">{error.personName}</div>
                                            <div class="error-message">{error.message}</div>
                                            <button
                                                class="btn btn-small"
                                                onClick={() => handleClearErrors(error.personName)}
                                                disabled={isLoading() || !apiStatus().errorLogs}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsTab;