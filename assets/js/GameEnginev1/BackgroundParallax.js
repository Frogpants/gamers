import GameObject from './GameObject.js';

/** Parallax Background GameObject
 * - Tiling: draw multiple of the image to fill the gameCanvas extents
 * - Scrolling: adds velocity or position updates to the update(), to scroll the background
 */
export class BackgroundParallax extends GameObject {
    /**
     * Constructor is called by GameLevel create() method
     * @param {Object} data - The data object for the background
     * @param {Object} gameEnv - The game environment object for convenient access to game properties 
     */
    constructor(data = null, gameEnv = null) {
        super(gameEnv);
        if (!data || !data.src) {
            console.error('BackgroundParallax requires a src property in data');
            throw new Error('BackgroundParallax requires a src property in data');
        }

        this.data = data;
        this.position = data.position ? { x: data.position.x || 0, y: data.position.y || 0 } : { x: 0, y: 0 };
        // Support either `parallaxSpeed` or `velocity` in data
        this.parallaxSpeed = (typeof data.parallaxSpeed !== 'undefined') ? data.parallaxSpeed : (typeof data.velocity !== 'undefined' ? data.velocity : 1);
        this.verticalFactor = (typeof data.verticalFactor !== 'undefined') ? data.verticalFactor : 0;
        this.moveOnKeyAction = !!data.moveOnKeyAction;

        // Keep gameEnv reference for optional runtime controls
        this.gameEnv = gameEnv || this.gameEnv || null;

        // Set the properties of the background
        this.image = new Image();
        this.image.src = data.src;
        this.isInitialized = false; // Flag to track initialization

        // Finish initializing the background after the image loads 
        this.image.onload = () => {
            // Width and height come from the image
            this.width = this.image.width;
            this.height = this.image.height;

            // Create the canvas element and context
            this.canvas = document.createElement("canvas");
            this.canvas.style.position = "absolute";
            this.canvas.id = data.id || "parallax-background";
            this.ctx = this.canvas.getContext("2d");

            // Apply style overrides if provided
            this.canvas.style.zIndex = String((typeof data.zIndex !== 'undefined') ? data.zIndex : 1);
            this.canvas.style.opacity = (typeof data.opacity !== 'undefined') ? String(data.opacity) : "0.3";

            // Align the canvas size to the gameCanvas
            this.alignCanvas();

            // Append the canvas to the DOM first in the container to be behind everything
            const gameContainer = document.getElementById("gameContainer");
            if (gameContainer && gameContainer.firstChild) {
                gameContainer.insertBefore(this.canvas, gameContainer.firstChild);
            } else if (gameContainer) {
                gameContainer.appendChild(this.canvas);
            } else {
                document.body.appendChild(this.canvas);
            }

            this.isInitialized = true; // Mark as initialized
        };

        this.image.onerror = () => {
            console.error("Error loading background parallax image:", data.src);
        };
    }

    /**
     * Align canvas to be the same size and position as the gameCanvas 
     */
    alignCanvas() {
        // align the canvas to the gameCanvas, Layered
        const gameCanvas = document.getElementById("gameCanvas");
        if (!gameCanvas) {
            console.error("Game canvas not found");
            return;
        }
        if (!this.canvas) return;
        this.canvas.width = gameCanvas.width;
        this.canvas.height = gameCanvas.height;
        this.canvas.style.left = gameCanvas.style.left || "0px";
        this.canvas.style.top = gameCanvas.style.top || "0px";
    }

    /**
     * Update is called by GameLoop on all GameObjects 
     */
    update() {
        if (!this.isInitialized) return;

        // compute current speed — supports moveOnKeyAction using a gameEnv backgroundDirection
        const direction = (this.moveOnKeyAction && this.gameEnv && typeof this.gameEnv.backgroundDirection !== 'undefined') ? this.gameEnv.backgroundDirection : 1;
        const speed = this.parallaxSpeed * direction;

        // Update the position for parallax scrolling
        this.position.x -= speed; // Move horizontally
        this.position.y += speed * this.verticalFactor; // Optional vertical movement

        // Wrap the position to prevent overflow
        if (this.position.x < -this.width) {
            this.position.x = 0;
        }
        if (this.position.x > this.width) {
            this.position.x = 0;
        }
        if (this.position.y > this.height) {
            this.position.y = 0;
        }
        if (this.position.y < -this.height) {
            this.position.y = 0;
        }

        // Draw the background image
        this.draw();
    }

    /**
     * Draws the background image within the canvas
     */
    draw() {
        if (!this.isInitialized || !this.ctx) {
            return; // Skip drawing if not initialized
        }

        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
    
        // Calculate the wrapped position, Scrolling
        let xWrapped = this.position.x % this.width;
        let yWrapped = this.position.y % this.height;
    
        if (xWrapped > 0) {
            xWrapped -= this.width;
        }
        if (yWrapped > 0) {
            yWrapped -= this.height;
        }
   
        // Calculate the number of draws needed to fill the canvas, Tiling
        const numHorizontalDraws = Math.ceil(canvasWidth / this.width) + 1;
        const numVerticalDraws = Math.ceil(canvasHeight / this.height) + 1;

        // Clear the canvas
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw the background image multiple times to fill the canvas, Tiling
        for (let i = 0; i < numHorizontalDraws; i++) {
            for (let j = 0; j < numVerticalDraws; j++) {
                this.ctx.drawImage(
                    this.image, // Source image
                    0, 0, this.width, this.height, // Source rectangle
                    xWrapped + i * this.width, yWrapped + j * this.height, this.width, this.height); // Destination rectangle
            }
        }
    }
    
    /**
     * Resize method is called by resize listener on all GameObjects
     */
    resize() {
        this.alignCanvas(); // Align the canvas to the gameCanvas
        this.draw(); // Redraw the canvas after resizing
    }
    
    /**
     * Destroy method to clean up resources
     */
    destroy() {
        // Check if canvas exists before trying to remove it
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Remove from gameObjects array if not already removed
        if (this.gameEnv && this.gameEnv.gameObjects) {
            const index = this.gameEnv.gameObjects.indexOf(this);
            if (index !== -1) {
                this.gameEnv.gameObjects.splice(index, 1);
            }
        }
    }

    /**
     * Convenience test harness: create a simple 3-layer parallax set for lessons
     * Usage: BackgroundParallax.createTestBackgrounds(gameEnv);
     * Returns array of created BackgroundParallax objects (may be empty on error)
     */
    static createTestBackgrounds(gameEnv) {
        if (!gameEnv) {
            console.error("createTestBackgrounds requires a gameEnv");
            return [];
        }
        const path = gameEnv.path || "";
        const layers = [
            { id: "parallax-far", src: path + "/images/gamify/parallaxbg.png", parallaxSpeed: 0.2, zIndex: 1, opacity: 0.35, verticalFactor: 0.0 },
            { id: "parallax-mid", src: path + "/images/gamify/parallaxbg.png", parallaxSpeed: 0.5, zIndex: 2, opacity: 0.55, verticalFactor: 0.02 },
            { id: "parallax-near", src: path + "/images/gamify/parallaxbg.png", parallaxSpeed: 1.0, zIndex: 3, opacity: 0.85, verticalFactor: 0.05 }
        ];
        const created = [];
        layers.forEach(cfg => {
            try {
                const bg = new BackgroundParallax(cfg, gameEnv);
                // add to gameEnv.gameObjects if available so engine can call update/draw
                if (gameEnv.gameObjects && Array.isArray(gameEnv.gameObjects)) {
                    gameEnv.gameObjects.push(bg);
                }
                created.push(bg);
            } catch (err) {
                console.error("Failed to create test background", err);
            }
        });
        return created;
    }

    /**
     * Create lesson-specific backgrounds. Each returns created BackgroundParallax instances array.
     */
    static createForSquares(gameEnv) {
        if (!gameEnv) return [];
        const path = gameEnv.path || "";
        const cfg = { id: 'bg-squares', src: path + '/images/gamify/parallax-squares.png', parallaxSpeed: 0.6, zIndex: 2, opacity: 0.5 };
        try {
            const bg = new BackgroundParallax(cfg, gameEnv);
            if (gameEnv.gameObjects && Array.isArray(gameEnv.gameObjects)) gameEnv.gameObjects.push(bg);
            return [bg];
        } catch (e) { console.error(e); return []; }
    }

    static createForBasic(gameEnv) {
        if (!gameEnv) return [];
        const path = gameEnv.path || "";
        const cfg = { id: 'bg-basic', src: path + '/images/gamify/parallax-basic.png', parallaxSpeed: 0.4, zIndex: 1, opacity: 0.4 };
        try {
            const bg = new BackgroundParallax(cfg, gameEnv);
            if (gameEnv.gameObjects && Array.isArray(gameEnv.gameObjects)) gameEnv.gameObjects.push(bg);
            return [bg];
        } catch (e) { console.error(e); return []; }
    }

    static createForEnd(gameEnv) {
        if (!gameEnv) return [];
        const path = gameEnv.path || "";
        const cfg = { id: 'bg-end', src: path + '/images/gamify/parallax-end.png', parallaxSpeed: 0.25, zIndex: 1, opacity: 0.6, verticalFactor: 0.01 };
        try {
            const bg = new BackgroundParallax(cfg, gameEnv);
            if (gameEnv.gameObjects && Array.isArray(gameEnv.gameObjects)) gameEnv.gameObjects.push(bg);
            return [bg];
        } catch (e) { console.error(e); return []; }
    }

    static createForFortuneFinders(gameEnv) {
        if (!gameEnv) return [];
        const path = gameEnv.path || "";
        // Slight snowfall / slow drift effect
        const cfg = { id: 'bg-fortune', src: path + '/images/gamify/parallax-fortune.png', parallaxSpeed: 0.15, zIndex: 1, opacity: 0.45, verticalFactor: 0.03 };
        try {
            const bg = new BackgroundParallax(cfg, gameEnv);
            if (gameEnv.gameObjects && Array.isArray(gameEnv.gameObjects)) gameEnv.gameObjects.push(bg);
            return [bg];
        } catch (e) { console.error(e); return []; }
    }
}

export default BackgroundParallax;