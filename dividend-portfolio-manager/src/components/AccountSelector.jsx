// src/components/AccountSelector.jsx - FIXED DROPDOWN POSITIONING
import { createSignal, createEffect, For, Show, onCleanup, onMount } from 'solid-js';
import { fetchDropdownOptions } from '../api';

function AccountSelector(props) {
    const [dropdownOptions, setDropdownOptions] = createSignal([]);
    const [isOpen, setIsOpen] = createSignal(false);
    const [isLoading, setIsLoading] = createSignal(false);
    let selectorRef;
    let dropdownRef;

    // Load dropdown options on mount
    createEffect(async () => {
        try {
            setIsLoading(true);
            console.log('Loading dropdown options...'); // Debug log
            const options = await fetchDropdownOptions();
            console.log('Loaded dropdown options:', options); // Debug log
            setDropdownOptions(options || []);
        } catch (error) {
            console.error('Failed to load account options:', error);
            setDropdownOptions([]);
        } finally {
            setIsLoading(false);
        }
    });

    // FIXED: Enhanced positioning logic for dropdown
    const positionDropdown = () => {
        if (!selectorRef || !dropdownRef) return;
        
        const rect = selectorRef.getBoundingClientRect();
        const dropdownHeight = dropdownRef.offsetHeight;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Check if there's enough space below
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Position dropdown
        if (spaceBelow >= dropdownHeight + 20 || spaceBelow >= spaceAbove) {
            // Position below
            dropdownRef.style.top = `${rect.bottom + 8}px`;
        } else {
            // Position above
            dropdownRef.style.top = `${rect.top - dropdownHeight - 8}px`;
        }
        
        // Horizontal positioning
        let leftPos = rect.left;
        const dropdownWidth = dropdownRef.offsetWidth;
        
        // Ensure dropdown doesn't go off screen horizontally
        if (leftPos + dropdownWidth > viewportWidth - 20) {
            leftPos = viewportWidth - dropdownWidth - 20;
        }
        if (leftPos < 20) {
            leftPos = 20;
        }
        
        dropdownRef.style.left = `${leftPos}px`;
        dropdownRef.style.width = `${Math.max(rect.width, 280)}px`;
    };

    // Handle click outside to close dropdown
    const handleClickOutside = (event) => {
        if (isOpen() && 
            !event.target.closest('.account-selector') && 
            !event.target.closest('.account-dropdown')) {
            setIsOpen(false);
        }
    };

    // Handle window resize to reposition dropdown
    const handleWindowResize = () => {
        if (isOpen() && dropdownRef) {
            positionDropdown();
        }
    };

    // Set up and clean up event listeners
    createEffect(() => {
        if (isOpen()) {
            document.addEventListener('click', handleClickOutside);
            window.addEventListener('resize', handleWindowResize);
            window.addEventListener('scroll', handleWindowResize);
            
            // Position dropdown after it's rendered
            setTimeout(positionDropdown, 0);
            
            onCleanup(() => {
                document.removeEventListener('click', handleClickOutside);
                window.removeEventListener('resize', handleWindowResize);
                window.removeEventListener('scroll', handleWindowResize);
            });
        }
    });

    // Clean up on component unmount
    onCleanup(() => {
        document.removeEventListener('click', handleClickOutside);
        window.removeEventListener('resize', handleWindowResize);
        window.removeEventListener('scroll', handleWindowResize);
    });

    const handleOptionSelect = (option) => {
        console.log('Selected option:', option); // Debug log
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
        console.log('Grouping options:', options); // Debug log
        
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

        console.log('Grouped options:', groups); // Debug log
        return groups;
    };

    return (
        <>
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
            </div>

            {/* FIXED: Dropdown rendered outside of parent container */}
            <Show when={isOpen()}>
                <div class="account-dropdown" ref={dropdownRef}>
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
        </>
    );
}

export default AccountSelector;