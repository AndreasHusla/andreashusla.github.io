const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 40;
const ROWS = canvas.height / GRID_SIZE;
const COLS = canvas.width / GRID_SIZE;
const BASE_MOVE_SPEED = 300;

let gameState = {
    score: 0,
    startTime: Date.now(),
    gameRunning: true,
    lastMove: 0,
    moveSpeed: BASE_MOVE_SPEED,
    doublePoints: false,
    doublePointsEnd: 0,
    speedBoostEnd: 0,
    weather: 'sunny',
    timeOfDay: 'day',
    dayNightCycle: Date.now()
};

let obstacles = [];
let powerUps = [];
let particles = [];
let tractorPath = [];
let weatherChangeTime = Date.now() + 15000;
let wheelRotation = 0;

let tractor = {
    x: 1,
    y: 1,
    direction: 0
};

let field = [];

function addParticle(x, y, type) {
    particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 60,
        maxLife: 60,
        type: type,
        size: Math.random() * 3 + 1
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        if (particle.type === 'smoke') {
            particle.vy -= 0.1;
            particle.vx *= 0.98;
        } else if (particle.type === 'dust') {
            particle.vy += 0.05;
            particle.vx *= 0.95;
        }
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        
        if (particle.type === 'smoke') {
            ctx.fillStyle = `rgba(100, 100, 100, ${alpha * 0.7})`;
        } else if (particle.type === 'dust') {
            ctx.fillStyle = `rgba(139, 69, 19, ${alpha * 0.8})`;
        } else if (particle.type === 'powerup') {
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        }
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function initializeField() {
    field = [];
    obstacles = [];
    powerUps = [];
    particles = [];
    tractorPath = [];
    wheelRotation = 0;
    
    for (let row = 0; row < ROWS; row++) {
        field[row] = [];
        for (let col = 0; col < COLS; col++) {
            if (row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1) {
                field[row][col] = 'border';
            } else {
                const rand = Math.random();
                if (rand < 0.7) {
                    field[row][col] = 'unplowed';
                } else if (rand < 0.85) {
                    field[row][col] = 'mud';
                } else {
                    field[row][col] = 'hard';
                }
            }
        }
    }
    
    // Hindernisse platzieren
    for (let i = 0; i < 8; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (COLS - 4)) + 2;
            y = Math.floor(Math.random() * (ROWS - 4)) + 2;
        } while ((x <= 3 && y <= 3) || field[y][x] !== 'unplowed');
        
        const obstacleType = Math.random() < 0.5 ? 'stone' : 'tree';
        obstacles.push({x, y, type: obstacleType});
        field[y][x] = 'obstacle';
    }
    
    // Power-Ups platzieren
    for (let i = 0; i < 5; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (COLS - 4)) + 2;
            y = Math.floor(Math.random() * (ROWS - 4)) + 2;
        } while ((x <= 3 && y <= 3) || field[y][x] === 'obstacle' || field[y][x] === 'border');
        
        const powerUpTypes = ['speed', 'doublePoints', 'timeBonus'];
        const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        powerUps.push({x, y, type: powerUpType, bounce: 0});
    }
    
    field[1][1] = 'tractor';
}

function drawWheel(x, y, radius, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    // Reifen (schwarz)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Felge (grau)
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    ctx.arc(0, 0, radius - 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Speichen (heller)
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius - 2, 0);
        ctx.stroke();
        ctx.rotate(Math.PI / 2);
    }
    
    // Zentraler Punkt
    ctx.fillStyle = '#CCCCCC';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
}

function drawTractor(x, y) {
    const pixelX = x * GRID_SIZE;
    const pixelY = y * GRID_SIZE;
    
    ctx.save();
    ctx.translate(pixelX + GRID_SIZE/2, pixelY + GRID_SIZE/2);
    ctx.rotate(tractor.direction * Math.PI / 2);
    
    // Schatten
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-16, -10, 32, 24);
    
    // Traktor Körper mit Gradient (größer)
    const gradient = ctx.createLinearGradient(-16, -12, -16, 12);
    gradient.addColorStop(0, '#FF4444');
    gradient.addColorStop(1, '#CC0000');
    ctx.fillStyle = gradient;
    ctx.fillRect(-16, -12, 32, 24);
    
    // Traktor Kabine (größer)
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(-12, -16, 24, 16);
    
    // Fenster (größer)
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(-8, -14, 16, 6);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -14, 16, 6);
    
    // Animierte Räder (größer)
    drawWheel(-12, -16, 8, wheelRotation);
    drawWheel(-12, 16, 8, wheelRotation);
    drawWheel(12, -12, 6, wheelRotation);
    drawWheel(12, 12, 6, wheelRotation);
    
    // Pflug (größer)
    const plowGradient = ctx.createLinearGradient(16, -8, 24, 8);
    plowGradient.addColorStop(0, '#A0522D');
    plowGradient.addColorStop(1, '#8B4513');
    ctx.fillStyle = plowGradient;
    ctx.fillRect(16, -8, 8, 16);
    
    // Pflug-Details
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, -4); ctx.lineTo(24, -4);
    ctx.moveTo(16, 0); ctx.lineTo(24, 0);
    ctx.moveTo(16, 4); ctx.lineTo(24, 4);
    ctx.stroke();
    
    // Auspuffrauch
    if (Math.random() < 0.3) {
        addParticle(pixelX - 4, pixelY - 20, 'smoke');
    }
    
    ctx.restore();
}

function updateDayNightCycle() {
    const currentTime = Date.now();
    const cycleTime = (currentTime - gameState.dayNightCycle) / 1000;
    
    if (cycleTime > 50) {
        gameState.dayNightCycle = currentTime;
    }
    
    if (cycleTime < 30) {
        gameState.timeOfDay = 'day';
    } else {
        gameState.timeOfDay = 'night';
    }
}

function drawField() {
    // Tag/Nacht Overlay
    if (gameState.timeOfDay === 'night') {
        ctx.fillStyle = 'rgba(25, 25, 60, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Wetter-Overlay
    if (gameState.weather === 'rainy') {
        ctx.fillStyle = 'rgba(100, 150, 200, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const x = col * GRID_SIZE;
            const y = row * GRID_SIZE;
            
            switch (field[row][col]) {
                case 'border':
                    ctx.fillStyle = '#654321';
                    break;
                case 'unplowed':
                    ctx.fillStyle = '#8B4513';
                    break;
                case 'mud':
                    ctx.fillStyle = '#6B4226';
                    break;
                case 'hard':
                    ctx.fillStyle = '#A0522D';
                    break;
                case 'plowed':
                    ctx.fillStyle = '#4A4A4A';
                    break;
                case 'obstacle':
                    ctx.fillStyle = '#4A4A4A';
                    break;
                case 'tractor':
                    ctx.fillStyle = '#4A4A4A';
                    break;
            }
            
            ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
            
            // Verschiedene Feldtypen visualisieren
            if (field[row][col] === 'mud') {
                ctx.fillStyle = 'rgba(101, 67, 33, 0.5)';
                ctx.fillRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
            } else if (field[row][col] === 'hard') {
                ctx.fillStyle = 'rgba(139, 69, 19, 0.8)';
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(x + i * 6 + 2, y + 2, 2, GRID_SIZE - 4);
                }
            }
            
            if (field[row][col] === 'plowed') {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    const lineY = y + (i + 1) * GRID_SIZE / 4;
                    ctx.moveTo(x + 2, lineY);
                    ctx.lineTo(x + GRID_SIZE - 2, lineY);
                }
                ctx.stroke();
            }
            
            if (field[row][col] === 'tractor') {
                drawTractor(col, row);
            }
        }
    }
    
    // Hindernisse zeichnen (größer und deutlicher)
    obstacles.forEach(obstacle => {
        const x = obstacle.x * GRID_SIZE;
        const y = obstacle.y * GRID_SIZE;
        
        if (obstacle.type === 'stone') {
            // Schatten für Stein
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(x + GRID_SIZE/2 + 2, y + GRID_SIZE/2 + 2, GRID_SIZE/2.2, 0, 2 * Math.PI);
            ctx.fill();
            
            // Stein mit Gradient
            const stoneGradient = ctx.createRadialGradient(
                x + GRID_SIZE/2 - 5, y + GRID_SIZE/2 - 5, 0,
                x + GRID_SIZE/2, y + GRID_SIZE/2, GRID_SIZE/2
            );
            stoneGradient.addColorStop(0, '#B0B0B0');
            stoneGradient.addColorStop(1, '#606060');
            ctx.fillStyle = stoneGradient;
            ctx.beginPath();
            ctx.arc(x + GRID_SIZE/2, y + GRID_SIZE/2, GRID_SIZE/2.2, 0, 2 * Math.PI);
            ctx.fill();
            
            // Stein-Details (Risse)
            ctx.strokeStyle = '#404040';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + GRID_SIZE/2 - 8, y + GRID_SIZE/2 - 3);
            ctx.lineTo(x + GRID_SIZE/2 + 5, y + GRID_SIZE/2 + 2);
            ctx.moveTo(x + GRID_SIZE/2 - 2, y + GRID_SIZE/2 - 8);
            ctx.lineTo(x + GRID_SIZE/2 + 3, y + GRID_SIZE/2 + 6);
            ctx.stroke();
            
        } else if (obstacle.type === 'tree') {
            // Schatten für Baum
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + GRID_SIZE/2 - 4, y + GRID_SIZE/2 + 6, 12, 16);
            ctx.beginPath();
            ctx.arc(x + GRID_SIZE/2 + 2, y + GRID_SIZE/2 - 8, 16, 0, 2 * Math.PI);
            ctx.fill();
            
            // Baumstamm (größer)
            const trunkGradient = ctx.createLinearGradient(
                x + GRID_SIZE/2 - 6, 0,
                x + GRID_SIZE/2 + 6, 0
            );
            trunkGradient.addColorStop(0, '#A0522D');
            trunkGradient.addColorStop(1, '#8B4513');
            ctx.fillStyle = trunkGradient;
            ctx.fillRect(x + GRID_SIZE/2 - 6, y + GRID_SIZE/2 + 4, 12, 16);
            
            // Stamm-Textur
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(x + GRID_SIZE/2 - 6, y + GRID_SIZE/2 + 8 + i * 4);
                ctx.lineTo(x + GRID_SIZE/2 + 6, y + GRID_SIZE/2 + 8 + i * 4);
                ctx.stroke();
            }
            
            // Baumkrone (größer)
            const crownGradient = ctx.createRadialGradient(
                x + GRID_SIZE/2 - 5, y + GRID_SIZE/2 - 15, 0,
                x + GRID_SIZE/2, y + GRID_SIZE/2 - 10, 15
            );
            crownGradient.addColorStop(0, '#32CD32');
            crownGradient.addColorStop(1, '#228B22');
            ctx.fillStyle = crownGradient;
            ctx.beginPath();
            ctx.arc(x + GRID_SIZE/2, y + GRID_SIZE/2 - 10, 15, 0, 2 * Math.PI);
            ctx.fill();
            
            // Zusätzliche Blätter-Details
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.arc(x + GRID_SIZE/2 - 8, y + GRID_SIZE/2 - 8, 6, 0, 2 * Math.PI);
            ctx.arc(x + GRID_SIZE/2 + 8, y + GRID_SIZE/2 - 12, 7, 0, 2 * Math.PI);
            ctx.arc(x + GRID_SIZE/2, y + GRID_SIZE/2 - 20, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
    
    // Traktor-Spur zeichnen
    if (tractorPath.length > 1) {
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.4)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        for (let i = 0; i < tractorPath.length; i++) {
            const point = tractorPath[i];
            const x = point.x * GRID_SIZE + GRID_SIZE/2;
            const y = point.y * GRID_SIZE + GRID_SIZE/2;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Reifenspuren
        ctx.strokeStyle = 'rgba(100, 50, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < tractorPath.length; i++) {
            const prev = tractorPath[i-1];
            const curr = tractorPath[i];
            const x1 = prev.x * GRID_SIZE + GRID_SIZE/2;
            const y1 = prev.y * GRID_SIZE + GRID_SIZE/2;
            const x2 = curr.x * GRID_SIZE + GRID_SIZE/2;
            const y2 = curr.y * GRID_SIZE + GRID_SIZE/2;
            
            ctx.beginPath();
            ctx.moveTo(x1 - 2, y1);
            ctx.lineTo(x2 - 2, y2);
            ctx.moveTo(x1 + 2, y1);
            ctx.lineTo(x2 + 2, y2);
            ctx.stroke();
        }
    }
    
    // Power-Ups zeichnen (animiert)
    powerUps.forEach(powerUp => {
        powerUp.bounce += 0.1;
        const x = powerUp.x * GRID_SIZE;
        const y = powerUp.y * GRID_SIZE + Math.sin(powerUp.bounce) * 2;
        
        // Glowing Effect
        const glowGradient = ctx.createRadialGradient(x + GRID_SIZE/2, y + GRID_SIZE/2, 0, x + GRID_SIZE/2, y + GRID_SIZE/2, GRID_SIZE);
        glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(x - 5, y - 5, GRID_SIZE + 10, GRID_SIZE + 10);
        
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 4, y + 4, GRID_SIZE - 8, GRID_SIZE - 8);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        
        let symbol = '';
        switch (powerUp.type) {
            case 'speed': symbol = '⚡'; break;
            case 'doublePoints': symbol = '💰'; break;
            case 'timeBonus': symbol = '⏰'; break;
        }
        
        ctx.fillText(symbol, x + GRID_SIZE/2, y + GRID_SIZE/2 + 8);
    });
    
    // Regen-Effekt
    if (gameState.weather === 'rainy') {
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.7)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 50; i++) {
            const x = (Date.now() / 10 + i * 20) % canvas.width;
            const y = (Date.now() / 5 + i * 15) % canvas.height;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 3, y + 8);
            ctx.stroke();
        }
    }
}

function moveTraktor(newX, newY, direction) {
    if (newX < 1 || newX >= COLS - 1 || newY < 1 || newY >= ROWS - 1) {
        endGame('Kollision mit dem Rand!');
        return false;
    }
    
    if (field[newY][newX] === 'obstacle') {
        endGame('Kollision mit Hindernis!');
        return false;
    }
    
    // Traktor-Spur hinzufügen
    tractorPath.push({x: tractor.x, y: tractor.y});
    if (tractorPath.length > 50) {
        tractorPath.shift();
    }
    
    // Räder rotieren
    wheelRotation += 0.3;
    
    // Power-Up einsammeln mit Animation
    const powerUpIndex = powerUps.findIndex(p => p.x === newX && p.y === newY);
    if (powerUpIndex !== -1) {
        const powerUp = powerUps[powerUpIndex];
        
        // Power-Up Sammel-Partikel
        for (let i = 0; i < 8; i++) {
            addParticle(
                newX * GRID_SIZE + GRID_SIZE/2,
                newY * GRID_SIZE + GRID_SIZE/2,
                'powerup'
            );
        }
        
        activatePowerUp(powerUp.type);
        powerUps.splice(powerUpIndex, 1);
    }
    
    const oldFieldType = field[tractor.y][tractor.x];
    field[tractor.y][tractor.x] = 'plowed';
    
    const newFieldType = field[newY][newX];
    let points = 0;
    let speedModifier = 1;
    
    // Punkte basierend auf Feldtyp
    if (newFieldType === 'unplowed') {
        points = 10;
    } else if (newFieldType === 'mud') {
        points = 8;
        speedModifier = 1.5;
    } else if (newFieldType === 'hard') {
        points = 15;
    } else if (newFieldType === 'plowed') {
        points = -2;
    }
    
    // Wetter-Boni
    if (gameState.weather === 'sunny' && newFieldType !== 'plowed') {
        points += 2;
    }
    
    // Doppelpunkte-Power-Up
    if (gameState.doublePoints && Date.now() < gameState.doublePointsEnd) {
        points *= 2;
    }
    
    // Staub-Partikel beim Pflügen
    if (newFieldType !== 'plowed') {
        const particleCount = newFieldType === 'hard' ? 5 : 3;
        for (let i = 0; i < particleCount; i++) {
            addParticle(
                newX * GRID_SIZE + Math.random() * GRID_SIZE,
                newY * GRID_SIZE + Math.random() * GRID_SIZE,
                'dust'
            );
        }
    }
    
    gameState.score = Math.max(0, gameState.score + points);
    
    // Geschwindigkeit anpassen
    gameState.moveSpeed = BASE_MOVE_SPEED * speedModifier;
    if (gameState.weather === 'rainy') {
        gameState.moveSpeed *= 1.3;
    }
    if (Date.now() < gameState.speedBoostEnd) {
        gameState.moveSpeed *= 0.6;
    }
    
    tractor.x = newX;
    tractor.y = newY;
    if (direction !== undefined) {
        tractor.direction = direction;
    }
    field[newY][newX] = 'tractor';
    
    return true;
}

function activatePowerUp(type) {
    const currentTime = Date.now();
    
    switch (type) {
        case 'speed':
            gameState.speedBoostEnd = currentTime + 8000;
            break;
        case 'doublePoints':
            gameState.doublePoints = true;
            gameState.doublePointsEnd = currentTime + 10000;
            break;
        case 'timeBonus':
            gameState.score += 50;
            break;
    }
}

function updateTractorPosition() {
    const currentTime = Date.now();
    if (currentTime - gameState.lastMove < gameState.moveSpeed) {
        return;
    }
    
    gameState.lastMove = currentTime;
    
    let newX = tractor.x;
    let newY = tractor.y;
    
    switch (tractor.direction) {
        case 0: newX++; break;
        case 1: newY++; break;
        case 2: newX--; break;
        case 3: newY--; break;
    }
    
    moveTraktor(newX, newY);
}

function updateWeather() {
    const currentTime = Date.now();
    if (currentTime > weatherChangeTime) {
        gameState.weather = gameState.weather === 'sunny' ? 'rainy' : 'sunny';
        weatherChangeTime = currentTime + (10000 + Math.random() * 15000);
    }
}

function updateScore() {
    document.getElementById('score').textContent = gameState.score;
    
    let totalFields = (ROWS - 2) * (COLS - 2) - obstacles.length;
    let plowedFields = 0;
    
    for (let row = 1; row < ROWS - 1; row++) {
        for (let col = 1; col < COLS - 1; col++) {
            if (field[row][col] === 'plowed' || field[row][col] === 'tractor') {
                plowedFields++;
            }
        }
    }
    
    let progress = Math.round((plowedFields / totalFields) * 100);
    document.getElementById('progress').textContent = progress + '%';
    
    let currentTime = Math.round((Date.now() - gameState.startTime) / 1000);
    document.getElementById('time').textContent = currentTime;
    
    if (progress >= 95) {
        endGame();
    }
}

function endGame(reason = 'Feld komplett gepflügt!') {
    gameState.gameRunning = false;
    let finalTime = Math.round((Date.now() - gameState.startTime) / 1000);
    let timeBonus = Math.max(0, 1000 - finalTime * 2);
    let finalScore = gameState.score + timeBonus;
    
    document.getElementById('finalScore').textContent = finalScore;
    document.getElementById('finalTime').textContent = finalTime;
    document.querySelector('#gameOver h2').textContent = reason;
    document.getElementById('gameOver').classList.remove('hidden');
}

function restartGame() {
    gameState = {
        score: 0,
        startTime: Date.now(),
        gameRunning: true,
        lastMove: 0,
        moveSpeed: BASE_MOVE_SPEED,
        doublePoints: false,
        doublePointsEnd: 0,
        speedBoostEnd: 0,
        weather: 'sunny',
        timeOfDay: 'day',
        dayNightCycle: Date.now()
    };
    
    tractor.x = 1;
    tractor.y = 1;
    tractor.direction = 0;
    
    weatherChangeTime = Date.now() + 15000;
    
    initializeField();
    document.getElementById('gameOver').classList.add('hidden');
    gameLoop();
}

function handleKeyPress(event) {
    if (!gameState.gameRunning) return;
    
    let newDirection = tractor.direction;
    
    switch (event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            if (tractor.direction !== 1) newDirection = 3;
            break;
        case 's':
        case 'arrowdown':
            if (tractor.direction !== 3) newDirection = 1;
            break;
        case 'a':
        case 'arrowleft':
            if (tractor.direction !== 0) newDirection = 2;
            break;
        case 'd':
        case 'arrowright':
            if (tractor.direction !== 2) newDirection = 0;
            break;
        default:
            return;
    }
    
    event.preventDefault();
    tractor.direction = newDirection;
}

function updateUI() {
    // Wetter-Anzeige aktualisieren
    const weatherElement = document.getElementById('weather');
    if (gameState.weather === 'sunny') {
        weatherElement.textContent = '☀️ Sonnig';
    } else {
        weatherElement.textContent = '🌧️ Regnerisch';
    }
    
    // Power-Up Status aktualisieren
    const speedBoostElement = document.getElementById('speedBoost');
    const doublePointsElement = document.getElementById('doublePoints');
    
    if (Date.now() < gameState.speedBoostEnd) {
        speedBoostElement.classList.remove('hidden');
    } else {
        speedBoostElement.classList.add('hidden');
    }
    
    if (gameState.doublePoints && Date.now() < gameState.doublePointsEnd) {
        doublePointsElement.classList.remove('hidden');
    } else {
        doublePointsElement.classList.add('hidden');
        if (Date.now() >= gameState.doublePointsEnd) {
            gameState.doublePoints = false;
        }
    }
}

function gameLoop() {
    if (!gameState.gameRunning) return;
    
    updateTractorPosition();
    updateWeather();
    updateDayNightCycle();
    updateParticles();
    updateUI();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawField();
    drawParticles();
    updateScore();
    
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', handleKeyPress);

initializeField();
gameLoop();