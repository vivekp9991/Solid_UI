// src/components/NotificationSystem.jsx
import { createSignal, createEffect, For, Show } from 'solid-js';

function NotificationSystem(props) {
    const [notifications, setNotifications] = createSignal([]);

    // Watch for account changes and show notification
    createEffect(() => {
        const account = props.selectedAccount?.();
        if (account && account.label) {
            showNotification(`Viewing: ${account.label}`, 'info');
        }
    });

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

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div class="notification-container">
            <For each={notifications()}>
                {notification => (
                    <div class={`notification notification-${notification.type}`}>
                        <div class="notification-content">
                            <div class="notification-message">{notification.message}</div>
                            <div class="notification-time">{notification.timestamp}</div>
                        </div>
                        <button 
                            class="notification-close"
                            onClick={() => removeNotification(notification.id)}
                        >
                            ×
                        </button>
                    </div>
                )}
            </For>
        </div>
    );
}

export default NotificationSystem;