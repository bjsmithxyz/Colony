/**
 * UI Tab Manager
 * Handles tabbed interfaces for statistics and modules
 */
export class UITabManager {
    constructor() {
        this.initializeTabs();
    }

    initializeTabs() {
        this.initializeStatsTabs();
        this.initializeModuleTabs();
    }

    initializeStatsTabs() {
        const statsTabs = document.querySelectorAll('.stats-tab');
        const statsContents = document.querySelectorAll('.stats-tab-content');
        
        statsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                statsTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                statsContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetTab) {
                        content.classList.add('active');
                    }
                });
                
                // Notify chart manager if charts tab is selected
                if (targetTab === 'charts') {
                    document.dispatchEvent(new CustomEvent('chartsTabOpened'));
                }
            });
        });
    }

    initializeModuleTabs() {
        const moduleTabs = document.querySelectorAll('.module-tab');
        const moduleContents = document.querySelectorAll('.module-tab-content');
        
        moduleTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                moduleTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                moduleContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetTab + 'Modules') {
                        content.classList.add('active');
                    }
                });
            });
        });
    }
}
