// ============================================
// LOADING SCREEN LOGIC
// ============================================

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainApp = document.getElementById('mainApp');
    
    setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        mainApp.classList.add('show');
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 2000);
}

window.addEventListener('load', () => {
    hideLoadingScreen();
});

setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen && !loadingScreen.classList.contains('fade-out')) {
        hideLoadingScreen();
    }
}, 5000);

// ============================================
// MAIN APPLICATION CODE
// ============================================

const DISCOUNTS = [
    { text: "Unlucky", icon: "😢", color: "#8B8B8B", probability: 10, needsDisclaimer: false },
    { text: "10% Off Order", icon: "🎫", color: "#ffccd5", probability: 30, needsDisclaimer: false },
    { text: "Free Topping", icon: "🍓", color: "#e44947", probability: 26, needsDisclaimer: true },
    { text: "20% Off Order", icon: "🎉", color: "#ffccd5", probability: 12, needsDisclaimer: false },
    { text: "40% Off Order", icon: "🌟", color: "#e44947", probability: 4, needsDisclaimer: false },
    { text: "Free Upgrade to L", icon: "⬆️", color: "#ffccd5", probability: 14, needsDisclaimer: true },
    { text: "Free Drink (M)", icon: "☕", color: "#e44947", probability: 4, needsDisclaimer: false }
];

const totalProbability = DISCOUNTS.reduce((sum, d) => sum + d.probability, 0);
console.log("Total probability:", totalProbability, "%");

let playsRemaining = 2;
let currentCoupon = null;
let isSpinning = false;
let currentRotation = 0;
let winningSegmentIndex = null;
let pulseAnimationFrame = null;

const spinButton = document.getElementById('spinButton');
const playAgainBtn = document.getElementById('playAgainBtn');
const resetSessionBtn = document.getElementById('resetSessionBtn');
const wheelCanvas = document.getElementById('wheelCanvas');
const couponDisplay = document.getElementById('couponDisplay');
const statusMessage = document.getElementById('statusMessage');
const playsLeftSpan = document.getElementById('playsLeft');
const socialModal = document.getElementById('socialModal');
const closeSocialBtn = document.getElementById('closeSocialModal');
const socialCouponText = document.getElementById('socialCouponText');

const ctx = wheelCanvas.getContext('2d');

const centerX = wheelCanvas.width / 2;
const centerY = wheelCanvas.height / 2;
const radius = 160;
const numberOfSegments = DISCOUNTS.length;
const anglePerSegment = (2 * Math.PI) / numberOfSegments;

const POINTER_ANGLE = -Math.PI / 2;

function init() {
    drawWheel(0, null, 1);
    spinButton.addEventListener('click', spinWheel);
    playAgainBtn.addEventListener('click', spinWheel);
    resetSessionBtn.addEventListener('click', resetSession);
    closeSocialBtn.addEventListener('click', closeSocialModal);
    updateUI();
}

// Draw wheel with EQUAL segments (visual only)
function drawWheel(rotation, highlightSegment = null, highlightIntensity = 1) {
    ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
    
    // Draw equal segments for fair appearance
    for (let i = 0; i < numberOfSegments; i++) {
        const startAngle = (i * anglePerSegment) + rotation;
        const endAngle = ((i + 1) * anglePerSegment) + rotation;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        
        let fillColor = DISCOUNTS[i].color;
        if (highlightSegment === i && highlightIntensity > 1) {
            if (DISCOUNTS[i].color === "#e44947") {
                ctx.fillStyle = '#ff6b6b';
            } else if (DISCOUNTS[i].color === "#ffccd5") {
                ctx.fillStyle = '#ffd5dc';
            } else {
                ctx.fillStyle = '#b0b0b0';
            }
        } else {
            ctx.fillStyle = fillColor;
        }
        ctx.fill();
        
        ctx.strokeStyle = highlightSegment === i ? '#FFD700' : '#fff';
        ctx.lineWidth = highlightSegment === i ? 5 : 3;
        ctx.stroke();
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        const textAngle = (i * anglePerSegment) + (anglePerSegment / 2) + rotation;
        ctx.rotate(textAngle);
        
        ctx.textAlign = 'center';
        
        let textColor;
        if (DISCOUNTS[i].color === '#e44947' || DISCOUNTS[i].color === '#8B8B8B') {
            textColor = '#fff';
        } else {
            textColor = '#333';
        }
        
        ctx.fillStyle = textColor;
        ctx.font = 'bold 14px "Libre Franklin", Arial, sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.font = '24px Arial';
        ctx.fillText(DISCOUNTS[i].icon, radius * 0.75, -5);
        
        ctx.font = 'bold 11px "Libre Franklin", Arial, sans-serif';
        const words = DISCOUNTS[i].text.split(' ');
        let line = '';
        let lineY = 15;
        
        for (let j = 0; j < words.length; j++) {
            const testLine = line + words[j] + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > 60 && j > 0) {
                ctx.fillText(line.trim(), radius * 0.75, lineY);
                line = words[j] + ' ';
                lineY += 12;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), radius * 0.75, lineY);
        
        ctx.restore();
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#e44947';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 6;
    ctx.stroke();
}

function getSegmentAtPointer(rotation) {
    let normalizedRotation = rotation % (2 * Math.PI);
    while (normalizedRotation < 0) {
        normalizedRotation += 2 * Math.PI;
    }
    
    let pointerAngleRelativeToWheel = POINTER_ANGLE - normalizedRotation;
    
    while (pointerAngleRelativeToWheel < 0) {
        pointerAngleRelativeToWheel += 2 * Math.PI;
    }
    pointerAngleRelativeToWheel = pointerAngleRelativeToWheel % (2 * Math.PI);
    
    const segmentIndex = Math.floor(pointerAngleRelativeToWheel / anglePerSegment) % numberOfSegments;
    
    return segmentIndex;
}

// Select discount based on WEIGHTED probability (behind the scenes)
function selectWeightedRandomDiscount() {
    const random = Math.random() * 100;
    
    let cumulative = 0;
    for (let i = 0; i < DISCOUNTS.length; i++) {
        cumulative += DISCOUNTS[i].probability;
        if (random < cumulative) {
            console.log(`Selected: ${DISCOUNTS[i].text} (${DISCOUNTS[i].probability}% chance, roll: ${random.toFixed(2)})`);
            return i;
        }
    }
    
    return DISCOUNTS.length - 1;
}

function animateWinningSegment(segmentIndex) {
    let pulseCount = 0;
    const maxPulses = 6;
    let pulseDirection = 1;
    let pulseIntensity = 1;
    
    function pulse() {
        pulseIntensity += pulseDirection * 0.15;
        
        if (pulseIntensity >= 2) {
            pulseDirection = -1;
            pulseCount++;
        } else if (pulseIntensity <= 1) {
            pulseDirection = 1;
        }
        
        drawWheel(currentRotation, segmentIndex, pulseIntensity);
        
        if (pulseCount < maxPulses) {
            pulseAnimationFrame = requestAnimationFrame(pulse);
        } else {
            drawWheel(currentRotation, segmentIndex, 1.5);
            pulseAnimationFrame = null;
        }
    }
    
    pulse();
}

function spinWheel() {
    if (isSpinning || playsRemaining <= 0) return;

    isSpinning = true;
    playsRemaining--;

    spinButton.disabled = true;
    playAgainBtn.disabled = true;

    if (pulseAnimationFrame) {
        cancelAnimationFrame(pulseAnimationFrame);
        pulseAnimationFrame = null;
    }

    // Select based on WEIGHTED probability
    const targetSegment = selectWeightedRandomDiscount();
    
    console.log("=== SPIN START ===");
    console.log("Target:", targetSegment, "-", DISCOUNTS[targetSegment].text, `(${DISCOUNTS[targetSegment].probability}%)`);
    
    const numberOfSpins = 5 + Math.random() * 2;
    const baseRotation = numberOfSpins * 2 * Math.PI;
    
    const targetSegmentCenter = targetSegment * anglePerSegment + (anglePerSegment / 2);
    
    let finalAngle = POINTER_ANGLE - targetSegmentCenter;
    
    while (finalAngle < 0) {
        finalAngle += 2 * Math.PI;
    }
    
    const totalRotation = baseRotation + finalAngle;
    
    const startRotation = currentRotation;
    
    const duration = 4000;
    const startTime = Date.now();
    
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    function animate() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easedProgress = easeOutCubic(progress);
        currentRotation = startRotation + (totalRotation * easedProgress);
        
        drawWheel(currentRotation, null, 1);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            const actualSegment = getSegmentAtPointer(currentRotation);
            winningSegmentIndex = actualSegment;
            
            console.log("=== SPIN END ===");
            console.log("Winner:", actualSegment, "-", DISCOUNTS[actualSegment].text);
            
            setTimeout(() => {
                animateWinningSegment(actualSegment);
                
                setTimeout(() => {
                    stopSpin(actualSegment);
                }, 300);
            }, 200);
        }
    }
    
    animate();
}

function stopSpin(segmentIndex) {
    const finalDiscount = DISCOUNTS[segmentIndex];
    currentCoupon = finalDiscount;

    // Show social modal UNLESS it's "Unlucky"
    if (finalDiscount.text !== "Unlucky") {
        showSocialModal(finalDiscount);
    } else {
        // For unlucky, show coupon immediately
        updateCouponDisplay();
        isSpinning = false;
        updateUI();
    }
}

function showSocialModal(discount) {
    socialCouponText.textContent = discount.text;
    socialModal.classList.add('show');
}

function closeSocialModal() {
    socialModal.classList.remove('show');
    
    // Now update coupon display and create confetti
    updateCouponDisplay();
    createConfetti();
    
    isSpinning = false;
    updateUI();
}

function createConfetti() {
    const colors = ['#e44947', '#ffccd5', '#ff8a8a', '#ffb3ba', '#e05555', '#ffd5dc'];
    const confettiCount = 30;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animation = `confetti-fall ${2 + Math.random() * 2}s linear`;
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 4000);
        }, i * 50);
    }
}

function updateCouponDisplay() {
    if (currentCoupon) {
        couponDisplay.classList.add('winner');
        
        if (currentCoupon.text === "Unlucky") {
            couponDisplay.innerHTML = `
                <div class="coupon-content">
                    <div class="coupon-icon">${currentCoupon.icon}</div>
                    <div class="coupon-title">Better luck next time!</div>
                </div>
            `;
        } else {
            let disclaimerHTML = '';
            if (currentCoupon.needsDisclaimer) {
                disclaimerHTML = '<div class="coupon-disclaimer">Only applicable to drinks</div>';
            }
            
            couponDisplay.innerHTML = `
                <div class="coupon-content">
                    <div class="coupon-icon">${currentCoupon.icon}</div>
                    <div class="coupon-title">${currentCoupon.text}</div>
                    ${disclaimerHTML}
                </div>
            `;
        }

        setTimeout(() => {
            couponDisplay.classList.remove('winner');
        }, 1500);
    }
}

function updateUI() {
    playsLeftSpan.textContent = playsRemaining;

    if (playsRemaining > 0) {
        statusMessage.innerHTML = `Ready to play? You have <strong>${playsRemaining}</strong> ${playsRemaining === 1 ? 'spin' : 'spins'} remaining.`;
    } else {
        statusMessage.innerHTML = `<strong>No spins remaining.</strong> Show your coupon to staff or reset for a new customer.`;
    }

    if (playsRemaining === 2 && !currentCoupon) {
        spinButton.style.display = 'flex';
        spinButton.disabled = false;
        playAgainBtn.style.display = 'none';
        resetSessionBtn.style.display = 'none';
    } else if (playsRemaining === 1) {
        spinButton.style.display = 'flex';
        spinButton.disabled = false;
        playAgainBtn.style.display = 'block';
        playAgainBtn.disabled = false;
        resetSessionBtn.style.display = 'block';
    } else if (playsRemaining === 0) {
        spinButton.style.display = 'flex';
        spinButton.disabled = true;
        playAgainBtn.style.display = 'none';
        resetSessionBtn.style.display = 'block';
    }
}

function resetSession() {
    playsRemaining = 2;
    currentCoupon = null;
    isSpinning = false;
    currentRotation = 0;
    winningSegmentIndex = null;

    if (pulseAnimationFrame) {
        cancelAnimationFrame(pulseAnimationFrame);
        pulseAnimationFrame = null;
    }

    // Close social modal if open
    socialModal.classList.remove('show');

    drawWheel(0, null, 1);

    couponDisplay.innerHTML = '<p class="placeholder">🎁 Spin to win a discount! 🎁</p>';

    updateUI();
}

window.addEventListener('resize', () => {
    drawWheel(currentRotation, winningSegmentIndex, 1);
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();

}
