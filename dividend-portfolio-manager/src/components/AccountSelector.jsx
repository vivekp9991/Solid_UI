// src/components/AccountSelector.jsx - SIMPLE DROPDOWN POSITIONING FIX
import { createSignal, createEffect, For, Show, onCleanup } from 'solid-js';
import { fetchDropdownOptions } from '../api';

function AccountSelector(props) {
    const [dropdownOptions, setDropdownOptions] = createSignal([]);
    const [isOpen, setIsOpen] = createSignal(false);
    const [isLoading, setIsLoading] = createSignal(false);
    let selectorRef;

    // Load dropdown options on mount
    createEffect(async () => {
        try {
            setIsLoading(true);
            const options = await fetchDropdownOptions();
            setDropdownOptions(options || []);
        } catch (error) {
            console.error('Failed to load account options:', error);
            setDropdownOptions([]);
        } finally {
            setIsLoading(false);
        }
    });

    // Handle click outside to close dropdown
    const handleClickOutside = (event) => {
        if (isOpen() && selectorRef && !selectorRef.contains(event.target)) {
            setIsOpen(false);
        }
    };

    // Set up event listeners when dropdown opens
    createEffect(() => {
        if (isOpen()) {
            document.addEventListener('mousedown', handleClickOutside);
            onCleanup(() => {
                document.removeEventListener('mousedown', handleClickOutside);
            });
        }
    });

    // Global cleanup on component unmount
    onCleanup(() => {
        document.removeEventListener('mousedown', handleClickOutside);
    });

    const handleOptionSelect = (option) => {
        console.log('Selected option:', option);
        props.onAccountChange(option);
        setIsOpen(false);
    };

    const toggleDropdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!props.disabled && !isLoading()) {
            setIsOpen(!isOpen());
        }
    };

    const getOptionIcon = (option) => {
        if (option.viewMode === 'all' || option.type === 'all') return '🌐';
        if (option.viewMode === 'person' || option.type === 'person') return '👤';
        if (option.viewMode === 'account' || option.type === 'account') return '🏦';
        return '📊';
    };

    const groupedOptions = () => {
        const options = dropdownOptions();
        
        const groups = {
            all: [],
            person: [],
            account: []
        };

        options.forEach(option => {
            const viewMode = option.viewMode || option.type;
            if (viewMode === 'all') {
                groups.all.push(option);
            } else if (viewMode === 'person') {
                groups.person.push(option);
            } else if (viewMode === 'account') {
                groups.account.push(option);
            }
        });

        return groups;
    };

    return (
        <div class="account-selector" ref={selectorRef}>
            <button 
                class={`account-selector-button ${isOpen() ? 'open' : ''}`}
                onClick={toggleDropdown}
                disabled={props.disabled || isLoading()}
                type="button"
            >
                <div class="selected-account">
                    <span class="account-icon">{getOptionIcon(props.selectedAccount())}</span>
                    <span class="account-label">{props.selectedAccount()?.label || 'All Accounts'}</span>
                </div>
                <span class="dropdown-arrow">{isOpen() ? '▲' : '▼'}</span>
            </button>

            {/* SIMPLE FIX: Dropdown positioned relative to parent */}
            <Show when={isOpen()}>
                <div class="account-dropdown">
                    <Show when={isLoading()}>
                        <div class="dropdown-loading">Loading accounts...</div>
                    </Show>
                    
                    <Show when={!isLoading() && dropdownOptions().length === 0}>
                        <div class="dropdown-empty">No accounts available</div>
                    </Show>

                    <Show when={!isLoading() && dropdownOptions().length > 0}>
                        <div class="dropdown-content">
                            {/* All Accounts Section */}
                            <Show when={groupedOptions().all.length > 0}>
                                <div class="dropdown-group">
                                    <div class="dropdown-group-label">All Accounts</div>
                                    <For each={groupedOptions().all}>
                                        {option => (
                                            <div 
                                                class={`dropdown-option ${props.selectedAccount()?.value === option.value ? 'selected' : ''}`}
                                                onClick={() => handleOptionSelect(option)}
                                            >
                                                <span class="option-icon">{getOptionIcon(option)}</span>
                                                <span class="option-label">{option.label}</span>
                                                <Show when={option.accountCount}>
                                                    <span class="option-badge">{option.accountCount}</span>
                                                </Show>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>

                            {/* Per Person Section */}
                            <Show when={groupedOptions().person.length > 0}>
                                <div class="dropdown-group">
                                    <div class="dropdown-group-label">By Person</div>
                                    <For each={groupedOptions().person}>
                                        {option => (
                                            <div 
                                                class={`dropdown-option ${props.selectedAccount()?.value === option.value ? 'selected' : ''}`}
                                                onClick={() => handleOptionSelect(option)}
                                            >
                                                <span class="option-icon">{getOptionIcon(option)}</span>
                                                <span class="option-label">{option.label}</span>
                                                <Show when={option.accountCount}>
                                                    <span class="option-badge">{option.accountCount}</span>
                                                </Show>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>

                            {/* Individual Accounts Section */}
                            <Show when={groupedOptions().account.length > 0}>
                                <div class="dropdown-group">
                                    <div class="dropdown-group-label">Individual Accounts</div>
                                    <For each={groupedOptions().account}>
                                        {option => (
                                            <div 
                                                class={`dropdown-option ${props.selectedAccount()?.value === option.value ? 'selected' : ''}`}
                                                onClick={() => handleOptionSelect(option)}
                                            >
                                                <span class="option-icon">{getOptionIcon(option)}</span>
                                                <span class="option-label">{option.label}</span>
                                                <Show when={option.accountType}>
                                                    <span class="option-type">{option.accountType}</span>
                                                </Show>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}

export default AccountSelector;