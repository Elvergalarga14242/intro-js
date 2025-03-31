// Game constants
const GAME_SPEED = 0.4;
const JUMP_FORCE = 0.5;
const GRAVITY = 0.02;
const OBSTACLE_SPAWN_RATE = 800;
const COIN_SPAWN_RATE = 2000;
const RUN_ANIMATION_SPEED = 0.2;
const CACTUS_SPAWN_RATE = 1000;

// Game state
let scene, camera, renderer;
let player, ground, road, obstacles = [], coins = [], cacti = [];
let score = 0;
let highScore = 0;
let gameStarted = false;
let gameOver = false;
let playerVelocity = new THREE.Vector3();
let lastObstacleSpawn = 0;
let lastCoinSpawn = 0;
let lastCactusSpawn = 0;
let animationTime = 0;
let pointTexts = [];

// Input state
const keys = {
    left: false,
    right: false,
    space: false
};

// Initialize game
function initGame() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFB366); // Lighter orange sky

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Create renderer with better quality
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    // Create player (humanoid)
    createHumanoidPlayer();

    // Create ground with better material
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.8,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create road with better material
    const roadGeometry = new THREE.PlaneGeometry(20, 200);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000,
        roughness: 0.9,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.9;
    road.receiveShadow = true;
    scene.add(road);

    // Add road lines with better materials
    for (let i = -100; i <= 100; i += 10) {
        // Center line
        const centerLineGeometry = new THREE.PlaneGeometry(0.2, 3);
        const centerLineMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF,
            roughness: 0.5,
            metalness: 0.5,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.2,
            side: THREE.DoubleSide
        });
        const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
        centerLine.rotation.x = -Math.PI / 2;
        centerLine.position.set(0, -0.8, i);
        centerLine.receiveShadow = true;
        scene.add(centerLine);

        // Side lines
        const sideLineGeometry = new THREE.PlaneGeometry(0.2, 2);
        const sideLineMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF,
            roughness: 0.5,
            metalness: 0.5,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.2,
            side: THREE.DoubleSide
        });
        
        const leftLine = new THREE.Mesh(sideLineGeometry, sideLineMaterial);
        leftLine.rotation.x = -Math.PI / 2;
        leftLine.position.set(-8, -0.8, i);
        leftLine.receiveShadow = true;
        scene.add(leftLine);
        
        const rightLine = new THREE.Mesh(sideLineGeometry, sideLineMaterial);
        rightLine.rotation.x = -Math.PI / 2;
        rightLine.position.set(8, -0.8, i);
        rightLine.receiveShadow = true;
        scene.add(rightLine);
    }

    // Create sunrise effect
    createSunriseEffect();

    // Add better lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Add hemisphere light for better ambient lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemisphereLight.position.set(0, 20, 0);
    scene.add(hemisphereLight);

    // Setup event listeners
    setupEventListeners();

    // Start game loop
    requestAnimationFrame(gameLoop);
}

function createHumanoidPlayer() {
    // Create player group
    player = new THREE.Group();

    // Body (more stylized)
    const bodyGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    player.add(body);

    // Head (more stylized)
    const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.3
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.2;
    head.castShadow = true;
    player.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        roughness: 0.2,
        metalness: 0.8
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 2.2, 0.2);
    leftEye.castShadow = true;
    player.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 2.2, 0.2);
    rightEye.castShadow = true;
    player.add(rightEye);

    // Arms (more dynamic)
    const armGeometry = new THREE.BoxGeometry(0.15, 0.8, 0.15);
    const armMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.3
    });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.3, 1.4, 0);
    leftArm.castShadow = true;
    player.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.3, 1.4, 0);
    rightArm.castShadow = true;
    player.add(rightArm);

    // Legs (more dynamic)
    const legGeometry = new THREE.BoxGeometry(0.15, 0.8, 0.15);
    const legMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.3
    });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.2, 0);
    leftLeg.castShadow = true;
    player.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.2, 0);
    rightLeg.castShadow = true;
    player.add(rightLeg);

    // Feet
    const footGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
    const footMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.3
    });
    
    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(-0.15, 0, 0);
    leftFoot.castShadow = true;
    player.add(leftFoot);
    
    const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
    rightFoot.position.set(0.15, 0, 0);
    rightFoot.castShadow = true;
    player.add(rightFoot);

    // Store references for animation
    player.leftArm = leftArm;
    player.rightArm = rightArm;
    player.leftLeg = leftLeg;
    player.rightLeg = rightLeg;
    player.leftFoot = leftFoot;
    player.rightFoot = rightFoot;

    // Set initial position
    player.position.set(-5, 0, 0);
    scene.add(player);
}

function createSunriseEffect() {
    // Create sun
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFFA500,
        emissive: 0xFFA500,
        emissiveIntensity: 0.5
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(0, 0, -100);
    sun.castShadow = true;
    scene.add(sun);

    // Create sun rays
    for (let i = 0; i < 12; i++) {
        const rayGeometry = new THREE.PlaneGeometry(2, 15);
        const rayMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFA500,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const ray = new THREE.Mesh(rayGeometry, rayMaterial);
        ray.position.set(0, 0, -100);
        ray.rotation.z = (i / 12) * Math.PI * 2;
        ray.rotation.x = Math.PI / 2;
        ray.castShadow = true;
        scene.add(ray);
    }
}

function createCactus() {
    const cactusGroup = new THREE.Group();
    
    // Main body with better material
    const bodyGeometry = new THREE.BoxGeometry(0.5, 2, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x228B22,
        roughness: 0.8,
        metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    cactusGroup.add(body);

    // Arms with better material
    for (let i = 0; i < 3; i++) {
        const armGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        const armMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228B22,
            roughness: 0.8,
            metalness: 0.2
        });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        
        const angle = (i - 1) * Math.PI / 4;
        arm.position.set(
            Math.cos(angle) * 0.5,
            2,
            Math.sin(angle) * 0.5
        );
        arm.rotation.x = angle;
        arm.castShadow = true;
        cactusGroup.add(arm);
    }

    // Position cactus
    const side = Math.random() > 0.5 ? 1 : -1;
    cactusGroup.position.set(
        side * (10 + Math.random() * 5),
        0,
        -20
    );

    scene.add(cactusGroup);
    cacti.push(cactusGroup);
}

function createBillboards() {
    const billboardTexts = [
        "¡JUEGA AHORA!",
        "¡SUPER JUEGO!",
        "¡DIVIÉRTETE!",
        "¡COLLECT COINS!",
        "¡JUMP HIGH!",
        "¡RUN FAST!"
    ];

    for (let side = -1; side <= 1; side += 2) {
        for (let i = -50; i <= 50; i += 15) {
            const height = Math.random() * 3 + 2; // Random height between 2 and 5
            const width = 3;
            
            // Billboard frame
            const frameGeometry = new THREE.BoxGeometry(width, height, 0.2);
            const frameMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x333333,
                side: THREE.DoubleSide
            });
            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            
            // Position billboard
            frame.position.set(
                side * (6 + width/2),
                height/2 - 1,
                i
            );
            
            frame.castShadow = true;
            frame.receiveShadow = true;
            scene.add(frame);
            billboards.push(frame);

            // Billboard content
            const contentGeometry = new THREE.PlaneGeometry(width - 0.2, height - 0.2);
            const contentMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffff00,
                side: THREE.DoubleSide
            });
            const content = new THREE.Mesh(contentGeometry, contentMaterial);
            content.position.set(
                side * (6 + width/2),
                height/2 - 1,
                i + (side * 0.1)
            );
            content.castShadow = true;
            content.receiveShadow = true;
            scene.add(content);
            billboards.push(content);
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') keys.left = true;
        if (e.key === 'ArrowRight') keys.right = true;
        if (e.key === ' ') {
            keys.space = true;
            
            if (!gameStarted) {
                gameStarted = true;
                document.getElementById('startScreen').style.display = 'none';
            }
            
            if (gameOver) {
                resetGame();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') keys.left = false;
        if (e.key === 'ArrowRight') keys.right = false;
        if (e.key === ' ') keys.space = false;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Game loop
function gameLoop() {
    if (gameStarted && !gameOver) {
        update();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    // Update player movement
    if (keys.left) player.position.x -= GAME_SPEED;
    if (keys.right) player.position.x += GAME_SPEED;

    // Keep player in bounds (increased range)
    player.position.x = Math.max(-8, Math.min(8, player.position.x));

    // Update player jump
    if (keys.space && player.position.y <= 0) {
        playerVelocity.y = JUMP_FORCE;
    }

    // Apply gravity
    playerVelocity.y -= GRAVITY;
    player.position.y += playerVelocity.y;

    // Ground collision
    if (player.position.y <= 0) {
        player.position.y = 0;
        playerVelocity.y = 0;
    }

    // Update player animation
    updatePlayerAnimation();

    // Update score
    score++;
    document.getElementById('score').textContent = `Score: ${Math.floor(score/10)}`;

    // Spawn obstacles
    const now = Date.now();
    if (now - lastObstacleSpawn > OBSTACLE_SPAWN_RATE) {
        lastObstacleSpawn = now;
        spawnObstacle();
    }

    // Spawn coins
    if (now - lastCoinSpawn > COIN_SPAWN_RATE) {
        lastCoinSpawn = now;
        spawnCoin();
    }

    // Spawn cacti
    if (now - lastCactusSpawn > CACTUS_SPAWN_RATE) {
        lastCactusSpawn = now;
        createCactus();
    }

    // Update obstacles
    obstacles.forEach((obstacle, index) => {
        obstacle.position.z += GAME_SPEED;

        // Remove off-screen obstacles
        if (obstacle.position.z > 10) {
            scene.remove(obstacle);
            obstacles.splice(index, 1);
        }

        // Check collision with player
        if (checkCollision(player, obstacle)) {
            gameOver = true;
            if (score > highScore) {
                highScore = score;
            }
            document.getElementById('gameOver').style.display = 'block';
            document.getElementById('finalScore').textContent = Math.floor(score/10);
        }
    });

    // Update coins
    coins.forEach((coin, index) => {
        coin.rotation.y += 0.1;
        coin.position.z += GAME_SPEED;

        // Remove off-screen coins
        if (coin.position.z > 10) {
            scene.remove(coin);
            coins.splice(index, 1);
        }

        // Check collision with player
        if (checkCollision(player, coin)) {
            scene.remove(coin);
            coins.splice(index, 1);
            createCoinEffect(coin.position);
        }
    });

    // Update cacti
    cacti.forEach((cactus, index) => {
        cactus.position.z += GAME_SPEED;

        // Remove off-screen cacti
        if (cactus.position.z > 10) {
            scene.remove(cactus);
            cacti.splice(index, 1);
        }
    });

    // Update point texts
    updatePointTexts();
}

function updatePlayerAnimation() {
    if (!gameStarted || gameOver) return;

    animationTime += RUN_ANIMATION_SPEED;

    // Enhanced running animation
    const armSwing = Math.sin(animationTime) * 0.4;
    const legSwing = Math.sin(animationTime) * 0.4;

    // Arms swing opposite to legs with more movement
    player.leftArm.rotation.x = armSwing;
    player.rightArm.rotation.x = -armSwing;

    // Legs swing with more movement
    player.leftLeg.rotation.x = -legSwing;
    player.rightLeg.rotation.x = legSwing;

    // Feet movement
    player.leftFoot.rotation.x = -legSwing * 0.5;
    player.rightFoot.rotation.x = legSwing * 0.5;

    // Add body tilt
    player.children[0].rotation.z = Math.sin(animationTime) * 0.15;

    // Add head bob
    player.children[1].position.y = 2.2 + Math.sin(animationTime) * 0.1;

    // Add slight eye movement
    player.children[2].position.x = -0.1 + Math.sin(animationTime) * 0.02;
    player.children[3].position.x = 0.1 + Math.sin(animationTime) * 0.02;
}

// Helper functions
function spawnObstacle() {
    const obstacleGeometry = new THREE.BoxGeometry(1, 2, 1);
    const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    
    obstacle.position.set(
        Math.random() * 16 - 8, // Random x position between -8 and 8
        0.5, // Ground level
        -20
    );
    
    obstacle.castShadow = true;
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function spawnCoin() {
    const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32);
    const coinMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    
    coin.position.set(
        Math.random() * 16 - 8, // Random x position between -8 and 8
        2, // Higher position for coins
        -20
    );
    
    coin.rotation.x = Math.PI / 2; // Lay flat
    coin.castShadow = true;
    scene.add(coin);
    coins.push(coin);
}

function createCoinEffect(position) {
    // Create particle effect
    for (let i = 0; i < 10; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        
        scene.add(particle);
        setTimeout(() => scene.remove(particle), 1000);
    }
}

function createPointText(position) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 32;
    
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, 64, 32);
    
    context.font = 'bold 24px Arial';
    context.fillStyle = '#FFD700';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('+50', 32, 16);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.copy(position);
    sprite.position.y += 1;
    sprite.scale.set(1, 0.5, 1);
    
    scene.add(sprite);
    pointTexts.push({
        sprite: sprite,
        time: 0,
        velocity: new THREE.Vector3(0, 0.1, 0)
    });
}

function updatePointTexts() {
    for (let i = pointTexts.length - 1; i >= 0; i--) {
        const pointText = pointTexts[i];
        pointText.time += 0.016;
        pointText.sprite.position.add(pointText.velocity);
        
        // Fade out
        pointText.sprite.material.opacity = 1 - (pointText.time / 2);
        
        if (pointText.time >= 2) {
            scene.remove(pointText.sprite);
            pointTexts.splice(i, 1);
        }
    }
}

function checkCollision(obj1, obj2) {
    const box1 = new THREE.Box3().setFromObject(obj1);
    const box2 = new THREE.Box3().setFromObject(obj2);
    if (box1.intersectsBox(box2)) {
        if (obj2.material.color.getHex() === 0xffd700) { // If it's a coin
            createPointText(obj2.position);
            score += 50;
        }
        return true;
    }
    return false;
}

function resetGame() {
    // Reset player
    player.position.set(-5, 0, 0);
    playerVelocity.set(0, 0, 0);

    // Clear obstacles, coins, and cacti
    obstacles.forEach(obstacle => scene.remove(obstacle));
    coins.forEach(coin => scene.remove(coin));
    cacti.forEach(cactus => scene.remove(cactus));
    obstacles = [];
    coins = [];
    cacti = [];

    // Reset game state
    score = 0;
    gameOver = false;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('score').textContent = 'Score: 0';
}

// Start the game
initGame(); 