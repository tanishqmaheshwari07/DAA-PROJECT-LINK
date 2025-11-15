class UnionFind {
    constructor(size) {
        this.parent = Array(size).fill().map((_, i) => i);
        this.rank = Array(size).fill(0);
    }

    find(x) {
        return this.parent[x] === x ? x : (this.parent[x] = this.find(this.parent[x]));
    }

    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX === rootY) return false;

        if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY;
        } else if (this.rank[rootX] > this.rank[rootY]) {
            this.parent[rootY] = rootX;
        } else {
            this.parent[rootY] = rootX;
            this.rank[rootX]++;
        }
        return true;
    }
}

class Graph {
    constructor() {
        this.vertices = [];
        this.edges = [];
    }

    addVertex(x, y) {
        // Prevent buildings too close to each other
        const MIN_DISTANCE = 30;
        const tooClose = this.vertices.some(v => {
            const dx = v.x - x;
            const dy = v.y - y;
            return Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE;
        });
        
        if (tooClose) return -1;
        
        this.vertices.push({ x, y });
        return this.vertices.length - 1;
    }

    addEdge(v1, v2) {
        // Validate vertices
        if (v1 === v2 || v1 < 0 || v2 < 0 || 
            v1 >= this.vertices.length || v2 >= this.vertices.length) {
            console.log('Invalid vertices:', v1, v2);
            return false;
        }
        
        // Check if edge already exists (in any direction)
        const exists = this.edges.some(edge => 
            (edge.v1 === v1 && edge.v2 === v2) || 
            (edge.v1 === v2 && edge.v2 === v1)
        );
        
        if (!exists) {
            try {
                const vertex1 = this.vertices[v1];
                const vertex2 = this.vertices[v2];
                
                // Calculate distance between vertices
                const dx = vertex1.x - vertex2.x;
                const dy = vertex1.y - vertex2.y;
                const weight = Math.round(Math.sqrt(dx * dx + dy * dy));
                
                // Add the edge
                this.edges.push({ 
                    v1: Math.min(v1, v2), // Always store in consistent order
                    v2: Math.max(v1, v2),
                    weight 
                });
                
                console.log(`Added edge between ${v1} and ${v2} with weight ${weight}`);
                return true;
            } catch (error) {
                console.error('Error adding edge:', error);
                return false;
            }
        } else {
            console.log('Edge already exists between', v1, 'and', v2);
            return false;
        }
    }

    findMST() {
        if (this.vertices.length < 2) return [];
        
        const sortedEdges = [...this.edges].sort((a, b) => a.weight - b.weight);
        const mstEdges = [];
        const uf = new UnionFind(this.vertices.length);
        
        for (const edge of sortedEdges) {
            if (uf.find(edge.v1) !== uf.find(edge.v2)) {
                uf.union(edge.v1, edge.v2);
                mstEdges.push({...edge});
                if (mstEdges.length === this.vertices.length - 1) break;
            }
        }
        
        return mstEdges;
    }
}

class PipelineApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.graph = new Graph();
        this.selectedVertex = null;
        this.hoveredVertex = null;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.mode = 'addBuilding';
        this.mstEdges = [];
        this.totalCost = 0;
        
        this.setupEventListeners();
        this.updateStatus('Click on the canvas to add buildings');
        this.animate();
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.lastMouseX = e.clientX - rect.left;
            this.lastMouseY = e.clientY - rect.top;
            this.hoveredVertex = this.findClosestVertex(this.lastMouseX, this.lastMouseY);
            
            // Only trigger re-render if we're in connection mode to improve performance
            if (this.mode === 'addConnection') {
                this.render();
            }
        });

        document.getElementById('addBuilding').addEventListener('click', () => {
            this.mode = 'addBuilding';
            this.selectedVertex = null;
            this.updateStatus('Click on the canvas to add buildings');
        });
        
        document.getElementById('addConnection').addEventListener('click', () => {
            if (this.graph.vertices.length < 2) {
                this.updateStatus('Add at least 2 buildings first');
                return;
            }
            this.mode = 'addConnection';
            this.selectedVertex = null;
            this.updateStatus('Click on the first building to connect');
        });
        
        document.getElementById('findMST').addEventListener('click', () => {
            if (this.graph.vertices.length < 2) {
                this.updateStatus('Add at least 2 buildings first');
                return;
            }
            this.mstEdges = this.graph.findMST();
            this.totalCost = this.mstEdges.reduce((sum, edge) => sum + edge.weight, 0);
            document.getElementById('totalCost').textContent = this.totalCost;
            this.updateStatus('Minimum Spanning Tree found!');
        });
        
        document.getElementById('reset').addEventListener('click', () => {
            this.graph = new Graph();
            this.mstEdges = [];
            this.totalCost = 0;
            document.getElementById('totalCost').textContent = '0';
            this.updateStatus('Click on the canvas to add buildings');
            this.mode = 'addBuilding';
            this.selectedVertex = null;
        });
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.mode === 'addBuilding') {
            const vertexIndex = this.graph.addVertex(x, y);
            if (vertexIndex !== -1) {
                this.updateStatus(`Added building ${vertexIndex + 1}. Click to add more or switch to 'Add Connection'`);
                this.render();
            } else {
                this.updateStatus('Buildings must be at least 30 pixels apart');
            }
        } 
        else if (this.mode === 'addConnection') {
            const vertexIndex = this.findClosestVertex(x, y);
            
            if (vertexIndex === null) {
                this.updateStatus('No building found near the click. Click directly on a building.');
                return;
            }
            
            // Visual feedback for selection
            if (this.selectedVertex === vertexIndex) {
                // Clicked the same building, deselect
                this.selectedVertex = null;
                this.updateStatus('Connection cancelled. Click on a building to connect');
                this.render();
                return;
            }
            
            if (this.selectedVertex === null) {
                // First selection
                this.selectedVertex = vertexIndex;
                this.updateStatus(`Selected building ${vertexIndex + 1}. Now click on another building to connect`);
                this.render(); // Update to show selection
            } else {
                // Second selection, create connection
                const existingEdge = this.graph.edges.some(edge => 
                    (edge.v1 === this.selectedVertex && edge.v2 === vertexIndex) || 
                    (edge.v1 === vertexIndex && edge.v2 === this.selectedVertex)
                );
                
                if (existingEdge) {
                    this.updateStatus('These buildings are already connected');
                    this.selectedVertex = null;
                    this.render();
                    return;
                }
                
                // Add the new connection
                if (this.graph.addEdge(this.selectedVertex, vertexIndex)) {
                    this.updateStatus(`Connected buildings ${this.selectedVertex + 1} and ${vertexIndex + 1}. Click to add more connections`);
                    this.mstEdges = []; // Clear any existing MST
                } else {
                    this.updateStatus('Failed to create connection. Please try again.');
                }
                this.selectedVertex = null;
                this.render();
            }
            
            // Always re-render to show selection state
            this.render();
        }
    }
    
    findClosestVertex(x, y, maxDistance = 40) {
        let closestDist = maxDistance * maxDistance; // Compare squared distances
        let closestIndex = null;
        
        this.graph.vertices.forEach((vertex, index) => {
            // Calculate distance to the base of the building (where the connection point should be)
            const buildingHeight = 32;
            const baseY = vertex.y + (buildingHeight / 2);
            const dx = vertex.x - x;
            const dy = baseY - y;
            const distanceSq = dx * dx + dy * dy;
            
            if (distanceSq < closestDist) {
                closestDist = distanceSq;
                closestIndex = index;
            }
        });
        
        return closestIndex;
    }
    
    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.render();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw edges as pipelines
        this.graph.edges.forEach(edge => {
            const v1 = this.graph.vertices[edge.v1];
            const v2 = this.graph.vertices[edge.v2];
            const isMST = this.mstEdges.some(e => 
                (e.v1 === edge.v1 && e.v2 === edge.v2) || 
                (e.v1 === edge.v2 && e.v2 === edge.v1)
            );
            
            // Draw pipeline effect (three parallel lines)
            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / length;
            const ny = dx / length;
            
            // Draw three parallel lines for pipeline effect
            const offset = isMST ? 2 : 1;
            for (let i = -1; i <= 1; i++) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = isMST ? '#2ecc71' : '#3498db';
                this.ctx.lineWidth = isMST ? 3 : 2;
                const offsetX = i * 2 * nx;
                const offsetY = i * 2 * ny;
                this.ctx.moveTo(v1.x + offsetX, v1.y + offsetY);
                this.ctx.lineTo(v2.x + offsetX, v2.y + offsetY);
                this.ctx.stroke();
            }
            
            // Draw weight in a nice box
            const midX = (v1.x + v2.x) / 2;
            const midY = (v1.y + v2.y) / 2;
            this.ctx.fillStyle = isMST ? '#27ae60' : '#2c3e50';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Draw background box for better visibility
            const textWidth = this.ctx.measureText(edge.weight).width;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.fillRect(midX - textWidth/2 - 5, midY - 15, textWidth + 10, 20);
            this.ctx.strokeStyle = isMST ? '#27ae60' : '#95a5a6';
            this.ctx.strokeRect(midX - textWidth/2 - 5, midY - 15, textWidth + 10, 20);
            
            // Draw weight text
            this.ctx.fillStyle = isMST ? '#27ae60' : '#2c3e50';
            this.ctx.fillText(edge.weight, midX, midY - 5);
        });
        
        // Draw connection preview
        if (this.mode === 'addConnection' && this.selectedVertex !== null) {
            const v1 = this.graph.vertices[this.selectedVertex];
            let previewX, previewY;
            
            if (this.hoveredVertex !== null && this.hoveredVertex !== this.selectedVertex) {
                // Preview connection to another building
                const v2 = this.graph.vertices[this.hoveredVertex];
                previewX = v2.x;
                previewY = v2.y;
                
                // Check if connection already exists
                const connectionExists = this.graph.edges.some(edge => 
                    (edge.v1 === this.selectedVertex && edge.v2 === this.hoveredVertex) || 
                    (edge.v1 === this.hoveredVertex && edge.v2 === this.selectedVertex)
                );
                
                this.ctx.strokeStyle = connectionExists ? '#e74c3c' : '#2ecc71';
                this.ctx.setLineDash([5, 3]);
            } else {
                // Preview connection to mouse position
                previewX = this.lastMouseX;
                previewY = this.lastMouseY;
                this.ctx.strokeStyle = '#3498db';
                this.ctx.setLineDash([5, 3]);
            }
            
            // Draw the preview line from the selected building to the target
            this.ctx.beginPath();
            this.ctx.lineWidth = 3;
            this.ctx.moveTo(v1.x, v1.y + 16); // Connect from base of building
            this.ctx.lineTo(previewX, previewY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // Draw all vertices as buildings
        this.graph.vertices.forEach((vertex, index) => {
            const isSelected = this.selectedVertex === index;
            const isHovered = this.hoveredVertex === index;
            
            // Determine colors based on state
            let buildingColor, roofColor, windowColor;
            
            if (isSelected) {
                buildingColor = '#e74c3c';
                roofColor = '#c0392b';
                windowColor = '#fff';
            } else if (isHovered && this.mode === 'addConnection') {
                buildingColor = '#f39c12';
                roofColor = '#d68910';
                windowColor = '#fff';
            } else if (isHovered) {
                buildingColor = '#3498db';
                roofColor = '#2980b9';
                windowColor = '#fff';
            } else {
                buildingColor = '#3498db';
                roofColor = '#2980b9';
                windowColor = '#fff';
            }
            
            // Draw building base
            const buildingWidth = 24;
            const buildingHeight = 32;
            const x = vertex.x - buildingWidth/2;
            const y = vertex.y - buildingHeight/2;
            
            // Draw shadow
            this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowOffsetX = 3;
            this.ctx.shadowOffsetY = 3;
            
            // Draw building
            this.ctx.fillStyle = buildingColor;
            this.ctx.fillRect(x, y, buildingWidth, buildingHeight);
            
            // Draw roof
            this.ctx.fillStyle = roofColor;
            this.ctx.beginPath();
            this.ctx.moveTo(x - 2, y);
            this.ctx.lineTo(vertex.x, y - 8);
            this.ctx.lineTo(x + buildingWidth + 2, y);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw windows
            this.ctx.fillStyle = windowColor;
            const windowSize = 4;
            const windowSpacing = 8;
            
            // Draw two rows of windows
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 2; col++) {
                    const windowX = x + (col + 1) * (buildingWidth / 3) - windowSize/2;
                    const windowY = y + (row + 1) * (buildingHeight / 3) - windowSize/2;
                    this.ctx.fillRect(windowX, windowY, windowSize, windowSize);
                }
            }
            
            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            
            // Draw building number on a badge at the bottom
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.beginPath();
            this.ctx.arc(vertex.x, y + buildingHeight + 10, 12, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(index + 1, vertex.x, y + buildingHeight + 10);
        });
    }
}

// Initialize the application when the page loads
window.onload = () => {
    const app = new PipelineApp();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        app.render();
    });
};
