/**
 * PauseMenu.js
 * 
 * A shared pause menu component that can be used across different games.
 * Creates a UI overlay with pause controls and statistics display.
 * 
 * Usage:
 *   const pauseMenu = new PauseMenu(gameControl, { parentId: 'gameContainer' });
 */
export default class PauseMenu {
    constructor(gameControl, options = {}) {
        this.gameControl = gameControl;
        this.options = {
            parentId: 'gameContainer',
            counterVar: 'levelsCompleted',
            counterLabel: 'Levels completed',
            counterPerLevel: false,
            storageKey: 'pauseMenuStats:game',
            ...options
        };

        // Merge with gameControl's pauseMenuOptions if they exist
        if (gameControl?.pauseMenuOptions) {
            this.options = { ...this.options, ...gameControl.pauseMenuOptions };
        }

        this.isOpen = false;
        this.parentElement = document.getElementById(this.options.parentId);
        
        if (!this.parentElement) {
            console.error(`Parent element with id "${this.options.parentId}" not found`);
            return;
        }

        this.createUI();
        this.setupEventListeners();
        
        // Register this pause menu with gameControl for ESC key handling
        if (this.gameControl) {
            this.gameControl.pauseMenu = this;
        }

        // Load and display stats if using localStorage
        this.loadStats();
    }

    /**
     * Creates the pause menu UI elements
     */
    createUI() {
        // Create overlay container
        this.overlay = document.createElement('div');
        this.overlay.className = 'pause-overlay';
        this.overlay.id = 'pauseOverlay';

        // Create main panel
        this.panel = document.createElement('div');
        this.panel.className = 'pause-panel';

        // Title
        const title = document.createElement('h2');
        title.className = 'pause-title';
        title.textContent = 'PAUSED';
        this.panel.appendChild(title);

        // Counter section (if enabled)
        if (this.options.counterLabel) {
            const counterWrap = document.createElement('div');
            counterWrap.className = 'pause-counter-wrap';
            
            const label = document.createElement('span');
            label.className = 'pause-counter-label';
            label.textContent = this.options.counterLabel + ':';
            
            this.counterNumber = document.createElement('span');
            this.counterNumber.className = 'pause-counter-number';
            this.counterNumber.textContent = '0';
            
            counterWrap.appendChild(label);
            counterWrap.appendChild(this.counterNumber);
            this.panel.appendChild(counterWrap);
        }

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'pause-button-container';

        // Resume button
        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'pause-btn resume';
        resumeBtn.textContent = 'Resume (P)';
        resumeBtn.addEventListener('click', () => this.toggle());
        buttonContainer.appendChild(resumeBtn);

        // Restart button (optional, depends on gameControl.restartLevel)
        if (this.gameControl?.restartLevel) {
            const restartBtn = document.createElement('button');
            restartBtn.className = 'pause-btn restart';
            restartBtn.textContent = 'Restart Level';
            restartBtn.addEventListener('click', () => this.restartLevel());
            buttonContainer.appendChild(restartBtn);
        }

        // Skip Level button (optional, depends on gameControl.endLevel)
        if (this.gameControl?.endLevel) {
            const skipBtn = document.createElement('button');
            skipBtn.className = 'pause-btn skip-level';
            skipBtn.textContent = 'Skip Level';
            skipBtn.addEventListener('click', () => this.skipLevel());
            buttonContainer.appendChild(skipBtn);
        }

        // Exit button (takes user back, optional)
        if (this.gameControl?.exit) {
            const exitBtn = document.createElement('button');
            exitBtn.className = 'pause-btn exit';
            exitBtn.textContent = 'Exit';
            exitBtn.addEventListener('click', () => this.exit());
            buttonContainer.appendChild(exitBtn);
        }

        this.panel.appendChild(buttonContainer);
        this.overlay.appendChild(this.panel);
        this.parentElement.appendChild(this.overlay);
    }

    /**
     * Setup event listeners for keyboard and UI interactions
     */
    setupEventListeners() {
        // ESC and P keys toggle pause
        this.keyListener = (e) => {
            if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
                e.preventDefault();
                this.toggle();
            }
        };

        // Click outside panel to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.toggle();
            }
        });

        document.addEventListener('keydown', this.keyListener);
    }

    /**
     * Toggle pause menu visibility
     */
    toggle() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show the pause menu
     */
    show() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        
        // Pause game logic if gameControl exists
        if (this.gameControl) {
            if (typeof this.gameControl.isPaused === 'boolean') {
                this.gameControl.isPaused = true;
            }
            // Call pause method if it exists
            if (typeof this.gameControl.pause === 'function') {
                this.gameControl.pause();
            }
        }

        this.updateCounterDisplay();
    }

    /**
     * Hide the pause menu
     */
    hide() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.overlay.style.display = 'none';

        // Resume game logic if gameControl exists
        if (this.gameControl) {
            if (typeof this.gameControl.isPaused === 'boolean') {
                this.gameControl.isPaused = false;
            }
            // Call resume method if it exists
            if (typeof this.gameControl.resume === 'function') {
                this.gameControl.resume();
            }
        }
    }

    /**
     * Update the counter display
     */
    updateCounterDisplay() {
        if (!this.counterNumber) return;

        const count = this.getCounterValue();
        this.counterNumber.textContent = count;
    }

    /**
     * Get the current counter value from gameControl or localStorage
     */
    getCounterValue() {
        // Try to get from gameControl first
        if (this.gameControl && this.gameControl[this.options.counterVar] !== undefined) {
            return this.gameControl[this.options.counterVar];
        }

        // Fall back to localStorage
        try {
            const stored = localStorage.getItem(this.options.storageKey);
            return stored ? parseInt(stored, 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Save stats to localStorage
     */
    saveStats() {
        try {
            const count = this.getCounterValue();
            localStorage.setItem(this.options.storageKey, count.toString());
        } catch (e) {
            // localStorage might not be available
        }
    }

    /**
     * Load stats from localStorage and update display
     */
    loadStats() {
        this.updateCounterDisplay();
    }

    /**
     * Skip the current level
     */
    skipLevel() {
        if (this.gameControl?.endLevel) {
            this.gameControl.endLevel();
            this.hide();
        }
    }

    /**
     * Restart the current level
     */
    restartLevel() {
        if (this.gameControl?.restartLevel) {
            this.gameControl.restartLevel();
            this.hide();
        }
    }

    /**
     * Exit the game
     */
    exit() {
        if (this.gameControl?.exit) {
            this.gameControl.exit();
        } else if (this.gameControl?.gameOver) {
            this.gameControl.gameOver();
        } else {
            // Fallback: reload or navigate away
            window.history.back();
        }
    }

    /**
     * Destroy the pause menu and clean up
     */
    destroy() {
        document.removeEventListener('keydown', this.keyListener);
        this.overlay.remove();
        if (this.gameControl) {
            this.gameControl.pauseMenu = null;
        }
    }
}
