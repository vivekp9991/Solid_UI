// src/components/SettingsTab.jsx
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
    getSyncStatus
} from '../api';

function SettingsTab() {
    const [activeSubTab, setActiveSubTab] = createSignal('personManagement');
    const [persons, setPersons] = createSignal([]);
    const [tokenStatuses, setTokenStatuses] = createSignal({});
    const [syncStatuses, setSyncStatuses] = createSignal({});
    const [errorLogs, setErrorLogs] = createSignal([]);
    const [dashboardData, setDashboardData] = createSignal({});
    const [isLoading, setIsLoading] = createSignal(false);
    
    // Form states
    const [newPersonForm, setNewPersonForm] = createSignal({
        personName: '',
        refreshToken: '',
        showToken: false
    });
    const [editingPerson, setEditingPerson] = createSignal(null);
    const [notifications, setNotifications] = createSignal([]);

    const subTabs = [
        { id: 'personManagement', icon: '👥', label: 'Person Management' },
        { id: 'tokenManagement', icon: '🔑', label: 'Token Management' },
        { id: 'dataSync', icon: '🔄', label: 'Data Synchronization' },
        { id: 'systemHealth', icon: '❤️', label: 'System Health' },
        { id: 'errorLogs', icon: '📋', label: 'Error Logs' }
    ];

    // Load data on mount
    onMount(async () => {
        await loadAllData();
        
        // Set up periodic refresh
        const interval = setInterval(loadAllData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    });

    const loadAllData = async () => {
        try {
            const [personsData, tokenData, syncData, dashData, errorData] = await Promise.all([
                fetchPersons().catch(() => []),
                getTokenStatus().catch(() => ({})),
                getSyncStatus().catch(() => ({})),
                fetchSettingsDashboard().catch(() => ({})),
                getErrorLogs({ days: 7 }).catch(() => [])
            ]);

            setPersons(personsData || []);
            setTokenStatuses(tokenData || {});
            setSyncStatuses(syncData || {});
            setDashboardData(dashData || {});
            setErrorLogs(errorData || []);
        } catch (error) {
            console.error('Failed to load settings data:', error);
            showNotification('Failed to load settings data', 'error');
        }
    };

    const showNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const handleCreatePerson = async () => {
        const form = newPersonForm();
        if (!form.personName || !form.refreshToken) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            setIsLoading(true);
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

    return (
        <div id="settings-tab">
            <div class="content-header">
                <h2 class="content-title">Settings & Configuration</h2>
                <div class="header-controls">
                    <button class="btn" onClick={loadAllData} disabled={isLoading()}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Notifications */}
            <Show when={notifications().length > 0}>
                <div class="notifications">
                    <For each={notifications()}>
                        {notification => (
                            <div class={`notification notification-${notification.type}`}>
                                {notification.message}
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
                                        disabled={isLoading()}
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
                                <div class="empty-state">No persons configured</div>
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
                                                disabled={isLoading()}
                                            >
                                                Test
                                            </button>
                                            <button
                                                class="btn btn-small"
                                                onClick={() => handleSyncPerson(person.personName)}
                                                disabled={isLoading()}
                                            >
                                                Sync
                                            </button>
                                            <button
                                                class="btn btn-small btn-danger"
                                                onClick={() => handleDeletePerson(person.personName)}
                                                disabled={isLoading()}
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

                {/* Token Management Tab */}
                <div class={`sub-tab-content ${activeSubTab() === 'tokenManagement' ? '' : 'hidden'}`}>
                    <div class="settings-card">
                        <div class="settings-header">🔑 Token Status Dashboard</div>
                        <div class="token-dashboard">
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
                                                    disabled={isLoading()}
                                                >
                                                    🔄 Refresh
                                                </button>
                                                <button
                                                    class="btn btn-small"
                                                    onClick={() => handleTestConnection(person.personName)}
                                                    disabled={isLoading()}
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
                    <div class="settings-card">
                        <div class="settings-header">🔄 Data Synchronization</div>
                        
                        <div class="sync-controls">
                            <div class="sync-global">
                                <h4>Global Sync</h4>
                                <div class="sync-buttons">
                                    <button
                                        class="btn btn-primary"
                                        onClick={() => handleSyncAll(false)}
                                        disabled={isLoading()}
                                    >
                                        🔄 Sync All (Incremental)
                                    </button>
                                    <button
                                        class="btn btn-warning"
                                        onClick={() => handleSyncAll(true)}
                                        disabled={isLoading()}
                                    >
                                        🔄 Full Sync All
                                    </button>
                                </div>
                            </div>

                            <div class="sync-individual">
                                <h4>Individual Sync</h4>
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
                                                        disabled={isLoading() || syncStatus?.isRunning}
                                                    >
                                                        🔄 Sync
                                                    </button>
                                                    <button
                                                        class="btn btn-small btn-warning"
                                                        onClick={() => handleSyncPerson(person.personName, true)}
                                                        disabled={isLoading() || syncStatus?.isRunning}
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
                        <div class="settings-header">❤️ System Health Overview</div>
                        <div class="health-dashboard">
                            <div class="health-metrics">
                                <div class="health-metric">
                                    <div class="metric-label">Total Persons</div>
                                    <div class="metric-value">{persons().length}</div>
                                </div>
                                <div class="health-metric">
                                    <div class="metric-label">Active Tokens</div>
                                    <div class="metric-value">
                                        {Object.values(tokenStatuses()).filter(s => s?.valid).length}
                                    </div>
                                </div>
                                <div class="health-metric">
                                    <div class="metric-label">Total Accounts</div>
                                    <div class="metric-value">
                                        {persons().reduce((sum, p) => sum + (p.accountCount || 0), 0)}
                                    </div>
                                </div>
                                <div class="health-metric">
                                    <div class="metric-label">Recent Errors</div>
                                    <div class="metric-value error">
                                        {errorLogs().filter(log => 
                                            new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                                        ).length}
                                    </div>
                                </div>
                            </div>

                            <div class="health-checks">
                                <h4>Connection Status</h4>
                                <For each={persons()}>
                                    {person => {
                                        const status = tokenStatuses()[person.personName];
                                        return (
                                            <div class="health-check-item">
                                                <div class="health-check-name">{person.personName}</div>
                                                <div 
                                                    class="health-check-status"
                                                    style={{ color: getTokenStatusColor(status) }}
                                                >
                                                    {getTokenStatusText(status)}
                                                </div>
                                                <button
                                                    class="btn btn-small"
                                                    onClick={() => handleTestConnection(person.personName)}
                                                    disabled={isLoading()}
                                                >
                                                    Test Now
                                                </button>
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Logs Tab */}
                <div class={`sub-tab-content ${activeSubTab() === 'errorLogs' ? '' : 'hidden'}`}>
                    <div class="settings-card">
                        <div class="settings-header">📋 Error Logs & Troubleshooting</div>
                        
                        <div class="error-controls">
                            <div class="error-filters">
                                <button class="btn btn-small" onClick={() => loadAllData()}>
                                    🔄 Refresh Logs
                                </button>
                                <For each={persons()}>
                                    {person => (
                                        <button
                                            class="btn btn-small"
                                            onClick={() => handleClearErrors(person.personName)}
                                        >
                                            Clear {person.personName} Errors
                                        </button>
                                    )}
                                </For>
                            </div>
                        </div>

                        <div class="error-logs">
                            <Show when={errorLogs().length === 0}>
                                <div class="empty-state">No recent errors</div>
                            </Show>
                            
                            <For each={errorLogs()}>
                                {error => (
                                    <div class="error-log-item">
                                        <div class="error-header">
                                            <div class="error-timestamp">
                                                {new Date(error.timestamp).toLocaleString()}
                                            </div>
                                            <div class="error-person">{error.personName}</div>
                                            <div class={`error-type error-type-${error.type}`}>
                                                {error.type}
                                            </div>
                                        </div>
                                        <div class="error-message">{error.message}</div>
                                        <Show when={error.details}>
                                            <div class="error-details">{error.details}</div>
                                        </Show>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsTab;