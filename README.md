 # FormWatcher

A lightweight JavaScript library to monitor and track changes in HTML forms. FormWatcher intelligently detects added, removed, and modified form fields, with support for dynamic form changes and real-time updates.

## Overview

FormWatcher provides a simple yet powerful way to track form state changes in your web applications. It's perfect for:

- **Detecting unsaved changes** before users navigate away
- **Implementing auto-save functionality** with change detection
- **Tracking form field modifications** for audit trails
- **Handling dynamic forms** where fields are added/removed at runtime
- **Building form validation workflows** based on change states

### Key Features

- ✅ **Real-time change detection** - Tracks input, select, textarea, checkbox, and radio button changes
- ✅ **Dynamic field support** - Automatically detects fields added or removed from the DOM
- ✅ **Flexible field exclusion** - Exclude specific fields from tracking using CSS selectors
- ✅ **Debounced updates** - Configurable debounce delay to optimize performance
- ✅ **Comprehensive change tracking** - Identifies added, removed, modified, and re-added fields
- ✅ **Callback support** - React to form changes with custom callbacks
- ✅ **Zero dependencies** - Pure JavaScript with no external dependencies
- ✅ **Lightweight** - Minimal footprint for optimal performance

## Installation
Hey
Install via npm:

```bash
npm install @etoundi1er/form-watcher
```

Or using yarn:

```bash
yarn add @etoundi1er/form-watcher
```

## How to Use

### Basic Usage

```javascript
import FormWatcher from '@etoundi1er/form-watcher';

// Initialize with a CSS selector
const watcher = new FormWatcher('#myForm');

// Check if form has changes
const hasChanges = watcher.checkForChanges();
console.log('Has changes:', hasChanges);

// Get detailed changes
const changes = watcher.getChanges();
console.log('Changes:', changes);
```

### With Options

```javascript
const watcher = new FormWatcher('#myForm', {
    debounceDelay: 500, // Wait 500ms after last change before checking
    excludeSelectors: ['#password', '.ignore-field', '[data-no-track]'], // Exclude specific fields
    onFormChanged: (hasChanges, changes, event) => {
        // Callback invoked whenever form changes are detected
        console.log('Form changed:', hasChanges);
        console.log('Details:', changes);
        console.log('Triggered by:', event?.target);

        // Enable/disable save button based on changes
        document.getElementById('saveBtn').disabled = !hasChanges;
    }
});
```

### Using DOM Element

```javascript
const formElement = document.querySelector('#myForm');
const watcher = new FormWatcher(formElement, {
    onFormChanged: (hasChanges, changes, event) => {
        if (hasChanges) {
            console.log('Modified fields:', changes.modified.length);
            console.log('Added fields:', changes.added.length);
            console.log('Removed fields:', changes.removed.length);
            console.log('Changed field:', event?.target?.name);
        }
    }
});
```

### Advanced Example: Prevent Navigation with Unsaved Changes

```javascript
const watcher = new FormWatcher('#myForm', {
    onFormChanged: (hasChanges) => {
        // Warn user before leaving page with unsaved changes
        window.onbeforeunload = hasChanges ? () => {
            return 'You have unsaved changes. Are you sure you want to leave?';
        } : null;
    }
});

// Reset state after saving
document.getElementById('saveBtn').addEventListener('click', async () => {
    await saveFormData();
    watcher.resetState(); // Mark current state as "original"
});
```

### Accessing the Triggering Event

The `onFormChanged` callback receives the event that triggered the change, allowing you to access detailed information about what caused the update:

```javascript
const watcher = new FormWatcher('#myForm', {
    onFormChanged: (hasChanges, changes, event) => {
        if (event) {
            // Access the field that triggered the change
            const field = event.target;
            console.log('Field name:', field.name);
            console.log('Field type:', field.type);
            console.log('New value:', field.value);

            // Show a toast notification
            if (hasChanges) {
                showToast(`Field "${field.name}" was modified`);
            }
        } else {
            // Event is null when changes are detected programmatically
            // (e.g., via MutationObserver or resetState)
            console.log('Changes detected programmatically');
        }
    }
});
```

**Note:** The `event` parameter may be `null` when changes are detected through non-user interactions, such as:
- Fields dynamically added/removed via the MutationObserver
- Programmatic calls to `resetState()`
- Initial state setup

Always use optional chaining (`event?.target`) when accessing the event object.

### Working with Dynamic Forms

```javascript
const watcher = new FormWatcher('#dynamicForm');

// FormWatcher automatically detects when fields are added
document.getElementById('addField').addEventListener('click', () => {
    const newField = document.createElement('input');
    newField.type = 'text';
    newField.name = 'dynamicField';
    document.getElementById('dynamicForm').appendChild(newField);
    // FormWatcher will automatically track this new field
});

// Or when fields are removed
document.getElementById('removeField').addEventListener('click', () => {
    const field = document.querySelector('[name="dynamicField"]');
    field?.remove();
    // FormWatcher will detect the removal
});
```

## API Reference

### Constructor

```javascript
new FormWatcher(formElementOrSelector, options)
```

**Parameters:**
- `formElementOrSelector` (string | HTMLElement) - CSS selector string or DOM element of the form to track
- `options` (Object) - Optional configuration object
  - `debounceDelay` (number) - Debounce delay in milliseconds (default: 300)
  - `excludeSelectors` (Array<string>) - Array of CSS selectors for fields to exclude from tracking (default: [])
  - `onFormChanged` (Function) - Callback function invoked when changes are detected (default: null)
    - Parameters: `(hasChanges: boolean, changes: Object, event: Event | null)`
    - `hasChanges` - Whether the form has changes compared to its original state
    - `changes` - Object containing detailed information about added, removed, modified, and re-added fields
    - `event` - The DOM event that triggered the change (may be `null` for programmatic changes)

### Methods

#### `checkForChanges()`
Compares the current form state with the original state and returns whether changes exist.

**Returns:** `boolean` - True if changes are detected, false otherwise

```javascript
const hasChanges = watcher.checkForChanges();
```

#### `getChanges()`
Returns a detailed object containing all changes categorized by type.

**Returns:** `Object` with the following structure:
```javascript
{
    added: [],      // Fields added after initialization
    removed: [],    // Fields removed from the form
    modified: [],   // Fields with changed values
    reAdded: []     // Fields that were removed and then added back
}
```

**Example:**
```javascript
const changes = watcher.getChanges();

changes.modified.forEach(field => {
    console.log(`Field ${field.id} changed from "${field.original.value}" to "${field.current.value}"`);
});
```

#### `resetState()`
Resets the original state to match the current state. Useful after saving form data.

```javascript
// After successfully saving
await saveForm();
watcher.resetState(); // Current state becomes the new baseline
```

### Change Object Structure

#### Modified Fields
```javascript
{
    id: 'field-id',
    original: { value: 'old value', checked: false },
    current: { value: 'new value', checked: true }
}
```

#### Added Fields
```javascript
{
    id: 'field-id',
    value: 'current value',
    checked: true // for checkboxes/radios
}
```

#### Removed Fields
```javascript
{
    id: 'field-id',
    value: 'last known value',
    checked: false // for checkboxes/radios
}
```

#### Re-added Fields
```javascript
{
    id: 'field-id',
    value: 'current value',
    checked: true,
    previousValue: 'value before removal',
    previousChecked: false
}
```

## Browser Support

FormWatcher uses modern JavaScript features and browser APIs. It is compatible with:

| Browser | Version |
|---------|---------|
| Chrome | ≥ 51 |
| Firefox | ≥ 54 |
| Safari | ≥ 10 |
| Edge | ≥ 15 |
| Opera | ≥ 38 |

**Required Browser Features:**
- ES6 Classes
- Map data structure
- MutationObserver API
- Dataset API
- querySelector/querySelectorAll

### Polyfills

For older browser support, you may need to include polyfills for:
- `Map` - [core-js](https://github.com/zloirock/core-js)
- `MutationObserver` - [mutation-observer](https://www.npmjs.com/package/mutation-observer)

## License

MIT License

Copyright (c) 2025 Frank Etoundi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

Found a bug or have a feature request? Please create an issue at:
https://github.com/etoundi1er/form_watcher/issues

## Author

**Frank Etoundi**
- Website: https://www.etoundi.com/
- Email: frank.etoundi@gmail.com
- GitHub: [@etoundi1er](https://github.com/etoundi1er)
