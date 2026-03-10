let currentMode = 'ticket';
let selectedFile = null;

// Set init timestamp
document.getElementById('initTs').textContent = now();

function now() {
    return new Date().toLocaleTimeString('en-GB', { hour12: false }) + '.' +
        String(new Date().getMilliseconds()).padStart(3, '0');
}

function addLog(msg, type = 'inf') {
    const el = document.createElement('div');
    el.className = `log-entry log-${type}`;
    el.innerHTML = `<span class="ts">${now()}</span><span class="msg">${msg}</span>`;
    const container = document.getElementById('logEntries');
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

    const dropZone = document.getElementById('dropZone');
    const label = dropZone.querySelector('.drop-text strong');
    const hint = dropZone.querySelector('.drop-text span');

    if (mode === 'pass') {
        label.textContent = 'Upload Pass Image';
        hint.textContent = 'OCR WILL EXTRACT ALL PASS DATA — PNG, JPG, WEBP';
        addLog('Mode switched → PASS verification (image scan)', 'inf');
    } else {
        label.textContent = 'Upload Ticket Image';
        hint.textContent = 'DRAG & DROP OR CLICK TO BROWSE — PNG, JPG, WEBP';
        addLog('Mode switched → TICKET verification', 'inf');
    }

    resetForm(true);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    loadFile(file);
}

function loadFile(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById('previewImg').src = ev.target.result;
        document.getElementById('previewFilename').textContent = `FILE: ${file.name}  |  SIZE: ${(file.size / 1024).toFixed(1)} KB`;
        document.getElementById('previewWrap').style.display = 'block';
        document.getElementById('dropZone').style.display = 'none';
        addLog(`Image loaded: ${file.name}`, 'inf');
    };
    reader.readAsDataURL(file);
}

function removeFile() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('previewWrap').style.display = 'none';
    document.getElementById('dropZone').style.display = 'flex';
    addLog('Image removed.', 'inf');
}

// Drag and drop
const dz = document.getElementById('dropZone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
});

const scanMessages = [
    'INITIALIZING OCR ENGINE...',
    'PREPROCESSING IMAGE...',
    'EXTRACTING TEXT REGIONS...',
    'PARSING TICKET ID...',
    'QUERYING DATABASE...',
    'VALIDATING ROUTE DATA...',
    'CHECKING EXPIRY...',
    'FINALIZING RESULT...',
];

function runScan() {
    // Both modes now require an image
    if (!selectedFile) {
        const label = currentMode === 'pass' ? 'pass' : 'ticket';
        addLog(`ERROR: No image provided for ${label} scan.`, 'err');
        flashPanel();
        return;
    }

    addLog(`Scan initiated — mode: ${currentMode.toUpperCase()}`, 'inf');

    // Show scanning UI
    document.getElementById('formArea').style.display = 'none';
    document.getElementById('resultCard').style.display = 'none';
    const overlay = document.getElementById('scanningOverlay');
    overlay.style.display = 'flex';

    let msgIndex = 0;
    const statusEl = document.getElementById('scanStatusText');

    const msgTimer = setInterval(() => {
        if (msgIndex < scanMessages.length) {
            statusEl.textContent = scanMessages[msgIndex];
            addLog(scanMessages[msgIndex].toLowerCase(), 'inf');
            msgIndex++;
        }
    }, 350);

    // Build FormData — image + mode only; backend extracts all fields via OCR
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('mode', currentMode);

    const endpoint = currentMode === 'ticket' ? '/scan-and-verify' : '/verify-pass';

    // Total scanning animation duration
    setTimeout(() => {
        clearInterval(msgTimer);

        fetch(endpoint, { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => showResult(data))
            .catch(() => {
                // Demo mode — simulate response when backend not connected
                showResult(simulateResponse());
            });
    }, scanMessages.length * 350 + 400);
}

function simulateResponse() {
    // Simulate a realistic response for demo purposes
    const isValid = Math.random() > 0.4;
    if (currentMode === 'ticket') {
        if (isValid) {
            return {
                status: 'valid',
                message: '✅ Genuine Ticket',
                extracted: {
                    ticket_id: 'TKT-' + Math.floor(10000 + Math.random() * 90000),
                    source: 'MUMBAI CST',
                    destn: 'PUNE JN',
                    class: 'II-SL',
                    date: new Date().toLocaleDateString()
                }
            };
        } else {
            const reasons = [
                { status: 'invalid', message: 'Fake Ticket (ID not found)' },
                { status: 'invalid', message: 'Ticket expired' },
                { status: 'invalid', message: 'Route mismatch' },
                { status: 'invalid', message: 'Could not read ticket' },
            ];
            return reasons[Math.floor(Math.random() * reasons.length)];
        }
    } else {
        // Pass mode — all data comes from OCR in real backend
        if (isValid) {
            return {
                status: 'valid',
                message: '✅ Valid Pass',
                extracted: {
                    pass_id: 'P-' + Math.floor(10000 + Math.random() * 90000),
                    name: 'RAHUL SHARMA',
                    source: 'MUMBAI CST',
                    destn: 'PUNE JN',
                    expiry: '31 MAR 2026'
                }
            };
        } else {
            const reasons = [
                { status: 'invalid', message: 'Pass expired' },
                { status: 'invalid', message: 'Pass ID not found in database' },
                { status: 'invalid', message: 'Name mismatch on pass' },
                { status: 'invalid', message: 'Could not read pass image' },
            ];
            return reasons[Math.floor(Math.random() * reasons.length)];
        }
    }
}

function showResult(data) {
    const overlay = document.getElementById('scanningOverlay');
    overlay.style.display = 'none';

    const card = document.getElementById('resultCard');
    const isValid = data.status === 'valid';
    const isInvalid = data.status === 'invalid';

    card.className = 'result-card ' + (isValid ? 'valid' : isInvalid ? 'invalid' : 'warn');
    card.style.display = 'block';

    document.getElementById('resultIcon').textContent = isValid ? '✓' : '✕';
    document.getElementById('resultVerdict').textContent = isValid ? 'GENUINE' : 'FLAGGED';
    document.getElementById('resultMessage').textContent = data.message || '';

    // Build extracted data grid
    const dataGrid = document.getElementById('resultData');
    dataGrid.innerHTML = '';

    if (data.extracted) {
        Object.entries(data.extracted).forEach(([k, v]) => {
            const row = document.createElement('div');
            row.className = 'data-row';
            row.innerHTML = `<label>${k.replace(/_/g, ' ')}</label><value>${v}</value>`;
            dataGrid.appendChild(row);
        });
    }

    addLog(
        `Scan complete → ${data.status.toUpperCase()} — ${data.message}`,
        isValid ? 'ok' : 'err'
    );
}

function flashPanel() {
    const panel = document.querySelector('.panel');
    panel.style.borderColor = 'var(--invalid)';
    panel.style.boxShadow = '0 0 20px rgba(255,45,85,0.2)';
    setTimeout(() => {
        panel.style.borderColor = '';
        panel.style.boxShadow = '';
    }, 600);
}

function resetForm(silent = false) {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('previewWrap').style.display = 'none';
    document.getElementById('dropZone').style.display = 'flex';
    document.getElementById('formArea').style.display = 'block';
    document.getElementById('scanningOverlay').style.display = 'none';
    document.getElementById('resultCard').style.display = 'none';
    if (!silent) addLog('Form reset. Ready for new scan.', 'inf');
}
/* ── CAMERA LOGIC ── */
let cameraStream = null;
let capturedBlob = null;
let currentSource = 'upload';

function switchSource(src) {
    currentSource = src;
    document.getElementById('srcUploadBtn').classList.toggle('active', src === 'upload');
    document.getElementById('srcCameraBtn').classList.toggle('active', src === 'camera');
    if (src === 'camera') {
        openCamera();
    }
}

function openCamera() {
    const modal = document.getElementById('cameraModal');
    modal.classList.add('open');
    const errEl = document.getElementById('cameraErrorMsg');
    errEl.style.display = 'none';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showCameraError('Camera API not supported in this browser.');
        return;
    }

    const constraints = {
        video: {
            facingMode: { ideal: 'environment' }, // rear camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    };

    addLog('Requesting camera access...', 'inf');

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            cameraStream = stream;
            const video = document.getElementById('cameraVideo');
            video.srcObject = stream;
            video.style.display = 'block';
            document.getElementById('cameraCanvas').style.display = 'none';
            document.getElementById('frozenBadge').style.display = 'none';
            document.getElementById('captureBtn').style.display = '';
            document.getElementById('retakeBtn').style.display = 'none';
            document.getElementById('useCaptureBtn').style.display = 'none';
            document.getElementById('camScanLine').style.display = 'block';
            addLog('Camera stream active.', 'inf');
        })
        .catch(err => {
            let msg = 'Camera access denied.';
            if (err.name === 'NotFoundError') msg = 'No camera device found.';
            else if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Please allow access in browser settings.';
            else if (err.name === 'NotReadableError') msg = 'Camera is already in use by another app.';
            showCameraError(msg);
            addLog(`Camera error: ${err.name}`, 'err');
        });
}

function showCameraError(msg) {
    const errEl = document.getElementById('cameraErrorMsg');
    errEl.textContent = '⚠ ' + msg;
    errEl.style.display = 'block';
    document.getElementById('cameraVideo').style.display = 'none';
}

function captureFrame() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');

    if (!cameraStream || video.readyState < 2) {
        addLog('ERROR: Camera not ready.', 'err');
        return;
    }

    // Draw current video frame to canvas
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Freeze UI
    video.style.display = 'none';
    canvas.style.display = 'block';
    document.getElementById('frozenBadge').style.display = 'flex';
    document.getElementById('camScanLine').style.display = 'none';
    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('retakeBtn').style.display = '';
    document.getElementById('useCaptureBtn').style.display = '';

    // Stop stream to release camera
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;

    // Convert to Blob
    canvas.toBlob(blob => {
        capturedBlob = blob;
        addLog(`Frame captured — ${(blob.size / 1024).toFixed(1)} KB`, 'inf');
    }, 'image/jpeg', 0.92);
}

function retakePhoto() {
    capturedBlob = null;
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    video.style.display = 'block';
    canvas.style.display = 'none';

    // Restart stream
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
        .then(stream => {
            cameraStream = stream;
            video.srcObject = stream;
            document.getElementById('frozenBadge').style.display = 'none';
            document.getElementById('camScanLine').style.display = 'block';
            document.getElementById('captureBtn').style.display = '';
            document.getElementById('retakeBtn').style.display = 'none';
            document.getElementById('useCaptureBtn').style.display = 'none';
            addLog('Camera restarted for retake.', 'inf');
        })
        .catch(() => showCameraError('Could not restart camera.'));
}

function useCapture() {
    if (!capturedBlob) {
        addLog('ERROR: No captured frame.', 'err');
        return;
    }

    // Convert blob to File object and inject into existing flow
    const file = new File([capturedBlob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
    closeCamera();
    loadFile(file);
    addLog('Camera capture loaded into scanner.', 'inf');

    // Switch source back visually
    document.getElementById('srcUploadBtn').classList.add('active');
    document.getElementById('srcCameraBtn').classList.remove('active');
    currentSource = 'upload';
}

function closeCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
    }
    capturedBlob = null;
    document.getElementById('cameraModal').classList.remove('open');
    document.getElementById('cameraVideo').srcObject = null;

    // reset source toggle if no file was loaded
    if (!selectedFile) {
        document.getElementById('srcUploadBtn').classList.add('active');
        document.getElementById('srcCameraBtn').classList.remove('active');
        currentSource = 'upload';
    }

    addLog('Camera closed.', 'inf');
}

