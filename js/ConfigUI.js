import CONFIG, { PRESETS } from './config.js';

/**
 * ConfigUI — small panel to view and edit configuration values at runtime.
 * - Renders a cog icon in the bottom-right outside the canvas
 * - Clicking the cog toggles a panel showing editable config fields
 * - Edits update the exported CONFIG object (shallow) so systems reading from
 *   CONFIG will pick up changes immediately where supported.
 *
 * This module keeps DOM responsibilities local and defensive: it will only
 * operate if `document` is available and required DOM nodes exist.
 */
export class ConfigUI {
    constructor(simulation) {
        this.simulation = simulation;
        this.open = false;
        this.container = null;
        this.panel = null;
        this.cogBtn = null;
        this.buildUI();
    }

    buildUI() {
        if (typeof document === 'undefined') return;

        // Container to group cog + panel
        this.container = document.createElement('div');
        this.container.id = 'configUiContainer';
        this.container.style.position = 'fixed';
        this.container.style.right = '12px';
        this.container.style.bottom = '12px';
        this.container.style.zIndex = '2000';

        // Cog button
        this.cogBtn = document.createElement('button');
        this.cogBtn.id = 'configCogBtn';
        this.cogBtn.className = 'action-btn secondary-btn';
        this.cogBtn.title = 'Configuration';
        this.cogBtn.style.width = '44px';
        this.cogBtn.style.height = '44px';
        this.cogBtn.style.padding = '6px';
        this.cogBtn.innerHTML = '⚙';
        this.cogBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });

        // Panel (hidden by default)
        this.panel = document.createElement('div');
        this.panel.id = 'configPanel';
        this.panel.className = 'control-card';
        this.panel.style.width = '320px';
        this.panel.style.maxHeight = '60vh';
        this.panel.style.overflow = 'auto';
        this.panel.style.display = 'none';
        this.panel.style.marginTop = '8px';
        this.panel.style.padding = '12px';
        this.panel.style.background = 'rgba(15,15,20,0.9)';
        this.panel.style.border = '1px solid rgba(255,255,255,0.04)';

        // Header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '8px';
        const title = document.createElement('div');
        title.textContent = 'Configuration';
        title.style.fontWeight = '700';
        title.style.fontSize = '14px';
        header.appendChild(title);

        // Preset select
        const presetSel = document.createElement('select');
        presetSel.id = 'configPresetSelect';
        presetSel.style.background = 'transparent';
        presetSel.style.color = '#fff';
        presetSel.style.border = '1px solid rgba(255,255,255,0.04)';
        presetSel.style.padding = '6px';
        presetSel.style.borderRadius = '6px';
        presetSel.style.fontSize = '13px';

        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Apply preset...';
        presetSel.appendChild(defaultOpt);
        Object.keys(PRESETS).forEach((k) => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            presetSel.appendChild(opt);
        });
        presetSel.addEventListener('change', (e) => {
            const val = e.target.value;
            if (!val) return;
            this.applyPreset(val);
            // reset to prompt
            e.target.value = '';
        });

        header.appendChild(presetSel);
        this.panel.appendChild(header);

        // Body — render editable fields for top-level config sections
        const body = document.createElement('div');
        body.id = 'configBody';

        // For each top-level key in CONFIG, create a collapsible group
        Object.keys(CONFIG).forEach((sectionKey) => {
            // Only show plain object sections and primitive values
            const val = CONFIG[sectionKey];
            const group = document.createElement('div');
            group.style.marginBottom = '10px';

            const label = document.createElement('div');
            label.textContent = sectionKey;
            label.className = 'control-label';
            group.appendChild(label);

            if (val && typeof val === 'object') {
                // render each sub-key which is a number, boolean or string
                Object.keys(val).forEach((subKey) => {
                    const subVal = val[subKey];
                    if (typeof subVal === 'number' || typeof subVal === 'string' || typeof subVal === 'boolean') {
                        const row = this.createFieldRow([sectionKey, subKey], subVal);
                        group.appendChild(row);
                    }
                });
            } else if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
                const row = this.createFieldRow([sectionKey], val);
                group.appendChild(row);
            }

            body.appendChild(group);
        });

        this.panel.appendChild(body);

        // Append to container and document
        this.container.appendChild(this.cogBtn);
        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);

        // Close panel on outside click
        document.addEventListener('click', (e) => {
            if (!this.open) return;
            if (!this.container.contains(e.target)) this.closePanel();
        });
    }

    createFieldRow(path, value) {
        // path is array like ['NODE','SIZE']
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.gap = '8px';
        row.style.marginBottom = '8px';

        const label = document.createElement('div');
        label.textContent = path.join('.');
        label.style.fontSize = '12px';
        label.style.color = '#cbd5e1';
        label.style.flex = '1 1 auto';

        let input;
        if (typeof value === 'boolean') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = !!value;
        } else if (typeof value === 'number') {
            input = document.createElement('input');
            input.type = 'number';
            input.value = String(value);
            input.style.width = '90px';
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.value = String(value);
            input.style.width = '140px';
        }
        input.style.background = 'transparent';
        input.style.color = '#fff';
        input.style.border = '1px solid rgba(255,255,255,0.04)';
        input.style.padding = '6px';
        input.style.borderRadius = '6px';
        input.style.fontSize = '13px';

        input.addEventListener('change', (e) => {
            this.updateConfigValue(path, input);
        });

        row.appendChild(label);
        row.appendChild(input);
        return row;
    }

    updateConfigValue(path, inputEl) {
        // shallowly update CONFIG for the given path
        const lastKey = path[path.length - 1];
        const parentPath = path.slice(0, -1);
        let target = CONFIG;
        for (const segment of parentPath) {
            if (!target[segment]) return;
            target = target[segment];
        }
        let newVal;
        if (inputEl.type === 'checkbox') newVal = inputEl.checked;
        else if (inputEl.type === 'number') newVal = Number(inputEl.value);
        else newVal = inputEl.value;

        // assign and notify simulation if present
        try {
            target[lastKey] = newVal;
        } catch (e) {}

        if (this.simulation && typeof this.simulation.onConfigUpdated === 'function') {
            try { this.simulation.onConfigUpdated(path.join('.'), newVal); } catch (e) {}
        }
    }

    applyPreset(name) {
        const preset = PRESETS[name];
        if (!preset) return;
        // shallow merge of top-level keys into CONFIG
        Object.keys(preset).forEach((k) => {
            if (typeof preset[k] === 'object' && CONFIG[k] && typeof CONFIG[k] === 'object') {
                Object.assign(CONFIG[k], preset[k]);
            } else {
                CONFIG[k] = preset[k];
            }
        });

        // Rebuild panel to reflect new values (simple approach)
        const body = document.getElementById('configBody');
        if (body) {
            body.innerHTML = '';
            Object.keys(CONFIG).forEach((sectionKey) => {
                const val = CONFIG[sectionKey];
                const group = document.createElement('div');
                group.style.marginBottom = '10px';
                const label = document.createElement('div');
                label.textContent = sectionKey;
                label.className = 'control-label';
                group.appendChild(label);
                if (val && typeof val === 'object') {
                    Object.keys(val).forEach((subKey) => {
                        const subVal = val[subKey];
                        if (typeof subVal === 'number' || typeof subVal === 'string' || typeof subVal === 'boolean') {
                            const row = this.createFieldRow([sectionKey, subKey], subVal);
                            group.appendChild(row);
                        }
                    });
                } else if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
                    const row = this.createFieldRow([sectionKey], val);
                    group.appendChild(row);
                }
                body.appendChild(group);
            });
        }

        if (this.simulation && typeof this.simulation.onConfigApplied === 'function') {
            try { this.simulation.onConfigApplied(name); } catch (e) {}
        }
    }

    togglePanel() {
        this.open = !this.open;
        if (this.open) this.openPanel(); else this.closePanel();
    }

    openPanel() {
        this.panel.style.display = 'block';
        this.cogBtn.style.transform = 'rotate(18deg)';
        this.open = true;
    }

    closePanel() {
        this.panel.style.display = 'none';
        this.cogBtn.style.transform = '';
        this.open = false;
    }
}

// Expose helper to initialize from main
export default ConfigUI;
