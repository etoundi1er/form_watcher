class FormWatcher {
    /**
     * FormWatcher class to monitor changes in a form.
     * It tracks added, removed, and modified fields, and can handle dynamic changes
     * such as fields being added or removed after initialization.
     * @param {string} formElementOrSelector - CSS selector for the form to track.
     * @param {Object} [options] - Configuration options.
     * @param {number} [options.debounceDelay=300] - Debounce delay in milliseconds for change detection.
     * @param {Array<string>} [options.excludeSelectors=[]] - Array of CSS selectors for fields to exclude from tracking.
     * @param {Function} [options.onFormChanged=null] - Callback function to invoke when form changes are detected.
     * @example
     * const tracker = new FormWatcher('#myForm', {
     *     excludeSelectors: ['#password', '.ignore-me'],
     *     onFormChanged: (hasChanges, changes, event) => {
     *         console.log('Form changed:', hasChanges, changes);
     *         console.log('Triggered by:', event?.target);
     *     }
     * });
     */
    constructor(formElementOrSelector, options = {}) {
        // Store form element
        this.form = typeof formElementOrSelector === 'string' ? document.querySelector(formElementOrSelector) : formElementOrSelector

        if (!this.form) {
            console.error('Form not found')
            return
        }

        // Configuration
        this.DEBOUNCE_DELAY = options.debounceDelay ?? 300 // Debounce delay in milliseconds

        // Store excluded selectors and callback from options
        this.excludeSelectors = options.excludeSelectors ?? []
        this.onFormChanged = typeof options.onFormChanged === 'function' ? options.onFormChanged : null

        // Store original, current, and removed field states
        this.originalState = new Map()
        this.currentState = new Map()
        this.removedFields = new Map() // Tracks removed fields by id
        this.lastEvent = null // Store the last event that triggered a change

        // Debounced checkForChanges
        this.debouncedCheckForChanges = this.debounce(() => this.checkForChanges(), this.DEBOUNCE_DELAY)

        this.initializeState()

        // Bind event listeners
        this.setupEventListeners()

        // Initialize MutationObserver
        this.setupMutationObserver()
    }

    // Debounce utility function
    debounce(func, delay) {
        let timeoutId
        return (...args) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => func.apply(this, args), delay)
        }
    }

    // Get field ID, checking data-form-watcher-id first, then id
    getFieldId(field) {
        return field.dataset.formWatcherId || field.id || ''
    }

    // Compare values (handles arrays for multi-select)
    valuesAreEqual(value1, value2) {
        if (Array.isArray(value1) && Array.isArray(value2)) {
            if (value1.length !== value2.length) return false
            return value1.every((val, index) => val === value2[index])
        }
        return value1 === value2
    }

    // Initialize original and current state
    initializeState() {
        const fields = this.form.querySelectorAll('input, select, textarea')
        fields.forEach((field) => {
            if (this.isExcluded(field)) return // Skip excluded fields

            const id = this.getOrSetFieldID(field)
            this.originalState.set(id, this.formatFieldState(field))
            this.currentState.set(id, this.formatFieldState(field))
        })
    }

    // Check if field should be excluded
    isExcluded(field) {
        return this.excludeSelectors.some((selector) => field.matches(selector) || this.getFieldId(field) === selector.replace(/^#/, ''))
    }

    getOrSetFieldID(field) {
        let id = this.getFieldId(field)

        if (!id) {
            // Generate ID using name + unique ID or just unique ID
            id = field.name ? `${field.name}-${crypto.randomUUID()}` : `${field.type}-${crypto.randomUUID()}`
            field.dataset.formWatcherId = id // Store in data attribute
        }

        return id
    }

    formatFieldState(field) {
        const checked = (field.type === 'checkbox' || field.type === 'radio') ? field.checked : undefined

        // Handle multi-select fields
        let value
        if (field.tagName.toLowerCase() === 'select' && field.multiple) {
            // For multi-select, get all selected values as an array
            value = Array.from(field.selectedOptions).map(option => option.value)
        } else {
            value = field.value || ''
        }

        return { field, value, checked }
    }

    // Setup event listeners
    setupEventListeners() {
        // Listen for change events (e.g., select, checkbox, radio)
        this.form.addEventListener('change', (e) => {
            if (['input', 'select', 'textarea'].includes(e.target.tagName.toLowerCase()) && !this.isExcluded(e.target)) {
                this.lastEvent = e // Store the event
                // if radio, update all in the same name group
                if (e.target.type === 'radio' && e.target.name) {
                    const group = this.form.querySelectorAll(`input[type="radio"][name="${e.target.name}"]`)
                    group.forEach((radio) => this.updateCurrentState(radio))
                } else {
                    this.updateCurrentState(e.target)
                }
            }
        })

        // Listen for input events (e.g., text input, textarea)
        this.form.addEventListener('input', (e) => {
            const target = e.target
            if (!this.isExcluded(target) && (target.tagName.toLowerCase() === 'textarea' || (target.tagName.toLowerCase() === 'input' && target.type === 'text'))) {
                this.lastEvent = e // Store the event
                this.updateCurrentState(target)
            }
        })
    }

    // Handle field change
    updateCurrentState(field) {
        const id = this.getOrSetFieldID(field)
        this.currentState.set(id, this.formatFieldState(field))
        this.debouncedCheckForChanges()
    }

    // Setup MutationObserver to detect added/removed fields from the DOM
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Handle added nodes
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const fields = node.matches('input, select, textarea') ? [node] : node.querySelectorAll('input, select, textarea')

                        fields.forEach((field) => {
                            if (this.isExcluded(field)) return // Skip excluded fields

                            this.updateCurrentState(field)
                        })
                    }
                })

                // Handle removed nodes
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const fields = node.matches('input, select, textarea') ? [node] : node.querySelectorAll('input, select, textarea')
                        fields.forEach((field) => {
                            if (this.isExcluded(field)) return // Skip excluded fields

                            const id = this.getFieldId(field)
                            if (id && this.currentState.has(id)) {
                                this.removedFields.set(id, this.currentState.get(id)) // Store removed field data
                                this.currentState.delete(id)
                                this.debouncedCheckForChanges()
                            }
                        })
                    }
                })
            })
        })

        observer.observe(this.form, {
            childList: true,
            subtree: true
        })
    }

    // Compare current state with original state
    checkForChanges() {
        let hasChanges = false

        // Check for changed values, added, and re-added fields
        for (const [id, data] of this.currentState) {
            const originalData = this.originalState.get(id)

            if (!originalData) {
                // Field is either added or re-added
                if (this.removedFields.has(id)) {
                    const removedData = this.removedFields.get(id)
                    // Re-added field: compare with removed value
                    if (!this.valuesAreEqual(removedData.value, data.value) || removedData.checked !== data.checked) {
                        hasChanges = true // Value differs from removed state
                        break
                    }
                } else {
                    // New field (not in original or removed)
                    hasChanges = true
                    break
                }
            } else if (!this.valuesAreEqual(originalData.value, data.value) || originalData.checked !== data.checked) {
                // Existing field with changed value
                hasChanges = true
                break
            }
        }

        // Check for removed fields
        if (!hasChanges) {
            for (const id of this.originalState.keys()) {
                if (!this.currentState.has(id)) {
                    hasChanges = true
                    break
                }
            }
        }

        // Invoke callback if provided
        if (this.onFormChanged) {
            this.onFormChanged(hasChanges, this.getChanges(), this.lastEvent)
        }

        return hasChanges
    }

    // Reset to original state
    resetState() {
        this.currentState.clear()
        this.originalState.forEach((data, id) => {
            this.currentState.set(id, { ...data })
        })
        this.debouncedCheckForChanges()
    }

    // Get current changes
    getChanges() {
        const changes = {
            added: [],
            removed: [],
            modified: [],
            reAdded: [] // Fields that were removed from the form and added back
        }

        // Find added, re-added, and modified
        for (const [id, data] of this.currentState) {
            const originalData = this.originalState.get(id)

            if (!originalData) {
                const change = { id, ...data }

                // Check if this field was previously removed
                const removedData = this.removedFields.get(id)
                if (removedData) {
                    change.previousValue = removedData.value
                    change.previousChecked = removedData.checked
                    changes.reAdded.push(change)
                } else {
                    changes.added.push(change)
                }
            } else if (!this.valuesAreEqual(originalData.value, data.value) || originalData.checked !== data.checked) {
                changes.modified.push({
                    id,
                    original: originalData,
                    current: data
                })
            }
        }

        // Find removed
        for (const [id, data] of this.originalState) {
            if (!this.currentState.has(id)) {
                changes.removed.push({ id, ...data })
            }
        }

        return changes
    }
}

export default FormWatcher
