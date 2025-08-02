/**
 * Assistive Navigation Control App
 * Web-based controller for Arduino assistive navigation device
 */

class AssistiveNavigationController {
    constructor() {
        this.device = null;
        this.characteristic = null;
        this.isConnected = false;
        this.currentSettings = {
            enabled: false,
            mode: 3,
            speed: 50,
            range: 50,
            battery: 100
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateUI();
        this.startStatusPolling();
    }

    bindEvents() {
        // Connection events
        document.getElementById('connectBtn').addEventListener('click', () => this.connectDevice());
        
        // System control events
        document.getElementById('enableBtn').addEventListener('click', () => this.enableSystem());
        document.getElementById('disableBtn').addEventListener('click', () => this.disableSystem());
        
        // Mode selection events
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setMode(parseInt(e.currentTarget.dataset.mode)));
        });
        
        // Slider events
        document.getElementById('speedSlider').addEventListener('input', (e) => this.setSpeed(parseInt(e.target.value)));
        document.getElementById('rangeSlider').addEventListener('input', (e) => this.setRange(parseInt(e.target.value)));
        
        // Voice control events
        document.getElementById('voiceBtn').addEventListener('click', () => this.toggleVoiceControl());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    async connectDevice() {
        try {
            if (!navigator.bluetooth) {
                this.showMessage('Bluetooth not supported. Use Chrome on HTTPS site', 'error');
                return;
            }

            if (location.protocol !== 'https:') {
                this.showMessage('HTTPS required for Bluetooth. Deploy to HTTPS site or use ngrok', 'error');
                return;
            }

            this.showMessage('Searching for devices...', 'info');
            
            // Real Bluetooth connection
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { name: 'NavAssist' },
                    { name: 'AssistiveNavigation' },
                    { namePrefix: 'ESP32' }
                ],
                optionalServices: ['0000110a-0000-1000-8000-00805f9b34fb'] // Serial Port Profile
            });

            this.showMessage('Connecting to ' + device.name + '...', 'info');
            
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('0000110a-0000-1000-8000-00805f9b34fb');
            this.bluetoothCharacteristic = await service.getCharacteristic('0000110e-0000-1000-8000-00805f9b34fb');
            
            this.isConnected = true;
            this.updateConnectionStatus('connected', 'Connected');
            this.showMessage('Device connected successfully!', 'success');
            
            // Show device info
            document.getElementById('deviceInfo').classList.remove('hidden');
            document.getElementById('deviceName').textContent = device.name;
            document.getElementById('deviceStatus').textContent = 'Connected via Bluetooth';
            
            // Start receiving status updates
            this.startStatusUpdates();
            
        } catch (error) {
            console.error('Connection error:', error);
            if (error.name === 'NotFoundError') {
                this.showMessage('Device not found. Make sure ESP32 is powered and nearby', 'error');
            } else {
                this.showMessage('Connection failed: ' + error.message, 'error');
            }
        }
    }

    async simulateConnection() {
        // Simulate connection process
        this.updateConnectionStatus('connecting', 'Connecting...');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.isConnected = true;
        this.updateConnectionStatus('connected', 'Connected');
        this.showMessage('Device connected successfully!', 'success');
        
        // Show device info
        document.getElementById('deviceInfo').classList.remove('hidden');
        document.getElementById('deviceName').textContent = 'Assistive Navigation Device';
        document.getElementById('deviceStatus').textContent = 'Connected via Bluetooth';
        
        // Start receiving status updates
        this.startStatusUpdates();
    }

    updateConnectionStatus(status, text) {
        const statusElement = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        statusElement.className = `connection-status ${status}`;
        statusText.textContent = text;
    }

    async sendCommand(command) {
        if (!this.isConnected) {
            this.showMessage('Device not connected', 'error');
            return false;
        }

        try {
            console.log('Sending command:', command);
            
            if (this.bluetoothCharacteristic) {
                // Send command via Bluetooth
                const encoder = new TextEncoder();
                await this.bluetoothCharacteristic.writeValue(encoder.encode(command + '\n'));
            } else {
                // Fallback for testing
                console.log('Bluetooth not available, command logged:', command);
            }
            
            return true;
        } catch (error) {
            console.error('Command error:', error);
            this.showMessage('Failed to send command', 'error');
            return false;
        }
    }

    async enableSystem() {
        if (await this.sendCommand('ENABLE')) {
            this.currentSettings.enabled = true;
            this.updateUI();
            this.showMessage('System enabled', 'success');
        }
    }

    async disableSystem() {
        if (await this.sendCommand('DISABLE')) {
            this.currentSettings.enabled = false;
            this.updateUI();
            this.showMessage('System disabled', 'success');
        }
    }

    async setMode(mode) {
        if (await this.sendCommand(`SET_MODE:${mode}`)) {
            this.currentSettings.mode = mode;
            this.updateUI();
            
            const modeNames = { 1: 'Buzzer Only', 2: 'Tap Only', 3: 'Both' };
            this.showMessage(`Mode set to: ${modeNames[mode]}`, 'success');
        }
    }

    async setSpeed(speed) {
        if (await this.sendCommand(`SET_SPEED:${speed}`)) {
            this.currentSettings.speed = speed;
            document.getElementById('speedValue').textContent = `${speed}%`;
            
            // Provide audio feedback for accessibility
            this.speak(`Speed set to ${speed} percent`);
        }
    }

    async setRange(range) {
        if (await this.sendCommand(`SET_RANGE:${range}`)) {
            this.currentSettings.range = range;
            document.getElementById('rangeValue').textContent = `${range}cm`;
            
            // Provide audio feedback for accessibility
            this.speak(`Range set to ${range} centimeters`);
        }
    }

    updateUI() {
        // Update system status
        const statusElement = document.getElementById('systemStatus');
        statusElement.textContent = this.currentSettings.enabled ? 'Enabled' : 'Disabled';
        statusElement.className = `status-badge ${this.currentSettings.enabled ? 'status-enabled' : 'status-disabled'}`;
        
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.mode) === this.currentSettings.mode);
        });
        
        // Update sliders
        document.getElementById('speedSlider').value = this.currentSettings.speed;
        document.getElementById('speedValue').textContent = `${this.currentSettings.speed}%`;
        
        document.getElementById('rangeSlider').value = this.currentSettings.range;
        document.getElementById('rangeValue').textContent = `${this.currentSettings.range}cm`;
        
        // Update battery
        this.updateBatteryDisplay(this.currentSettings.battery);
    }

    updateBatteryDisplay(level) {
        const batteryFill = document.getElementById('batteryLevel');
        const batteryIcon = document.getElementById('batteryIcon');
        const batteryStatus = document.getElementById('batteryStatus');
        
        batteryFill.style.width = `${level}%`;
        
        // Update battery color and status
        batteryFill.className = 'battery-fill';
        if (level < 20) {
            batteryFill.classList.add('low');
            batteryStatus.textContent = 'Low';
            batteryIcon.className = 'fas fa-battery-empty battery-icon';
        } else if (level < 50) {
            batteryFill.classList.add('medium');
            batteryStatus.textContent = 'Medium';
            batteryIcon.className = 'fas fa-battery-half battery-icon';
        } else {
            batteryStatus.textContent = 'Good';
            batteryIcon.className = 'fas fa-battery-full battery-icon';
        }
    }

    startStatusUpdates() {
        // Simulate receiving status updates from device
        setInterval(() => {
            if (this.isConnected) {
                // Simulate battery drain
                this.currentSettings.battery = Math.max(0, this.currentSettings.battery - 0.1);
                this.updateBatteryDisplay(Math.round(this.currentSettings.battery));
                
                // Low battery warning
                if (this.currentSettings.battery < 20 && this.currentSettings.battery % 5 === 0) {
                    this.showMessage('Low battery warning!', 'error');
                    this.speak('Low battery');
                }
            }
        }, 5000);
    }

    startStatusPolling() {
        // Poll for status updates every 2 seconds when connected
        setInterval(() => {
            if (this.isConnected) {
                this.sendCommand('GET_STATUS');
            }
        }, 2000);
    }

    toggleVoiceControl() {
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceStatus = document.getElementById('voiceStatus');
        
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            if (!this.recognition) {
                this.initSpeechRecognition();
            }
            
            if (this.isListening) {
                this.recognition.stop();
                this.isListening = false;
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Voice Control';
                voiceStatus.classList.add('hidden');
            } else {
                this.recognition.start();
                this.isListening = true;
                voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Stop Voice Control';
                voiceStatus.classList.remove('hidden');
            }
        } else {
            this.showMessage('Speech recognition not supported', 'error');
        }
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            this.processVoiceCommand(command);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.showMessage('Voice recognition error', 'error');
        };
    }

    processVoiceCommand(command) {
        console.log('Voice command:', command);
        
        if (command.includes('enable')) {
            this.enableSystem();
        } else if (command.includes('disable')) {
            this.disableSystem();
        } else if (command.includes('mode buzzer')) {
            this.setMode(1);
        } else if (command.includes('mode tap')) {
            this.setMode(2);
        } else if (command.includes('mode both')) {
            this.setMode(3);
        } else if (command.includes('status')) {
            this.speakStatus();
        } else {
            this.speak('Command not recognized');
        }
    }

    handleKeyboard(event) {
        // Keyboard shortcuts for accessibility
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'e':
                    event.preventDefault();
                    this.enableSystem();
                    break;
                case 'd':
                    event.preventDefault();
                    this.disableSystem();
                    break;
                case '1':
                    event.preventDefault();
                    this.setMode(1);
                    break;
                case '2':
                    event.preventDefault();
                    this.setMode(2);
                    break;
                case '3':
                    event.preventDefault();
                    this.setMode(3);
                    break;
            }
        }
        
        // Space bar for voice control
        if (event.code === 'Space' && event.target.tagName !== 'INPUT') {
            event.preventDefault();
            this.toggleVoiceControl();
        }
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        }
    }

    speakStatus() {
        const status = `System is ${this.currentSettings.enabled ? 'enabled' : 'disabled'}. ` +
                     `Current mode is ${this.currentSettings.mode === 1 ? 'buzzer only' : 
                                        this.currentSettings.mode === 2 ? 'tap only' : 'both'}. ` +
                     `Speed is ${this.currentSettings.speed} percent. ` +
                     `Battery is ${this.currentSettings.battery < 20 ? 'low' : 
                                  this.currentSettings.battery < 50 ? 'medium' : 'good'}.`;
        this.speak(status);
    }

    showMessage(text, type = 'info') {
        const messagesContainer = document.getElementById('messages');
        const message = document.createElement('div');
        
        message.className = `message ${type}`;
        message.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                           type === 'error' ? 'fa-exclamation-circle' : 
                           'fa-info-circle'}"></i>
            <span>${text}</span>
        `;
        
        messagesContainer.appendChild(message);
        
        // Auto-remove message after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);
        
        // Speak important messages for accessibility
        if (type === 'error' || type === 'success') {
            this.speak(text);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.assistiveController = new AssistiveNavigationController();
    
    // Add service worker for offline functionality if supported
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
});

// Make app installable as PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button or prompt
    const installBtn = document.createElement('button');
    installBtn.textContent = 'Install App';
    installBtn.className = 'btn btn-secondary';
    installBtn.onclick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User ${outcome} the install prompt`);
            deferredPrompt = null;
        }
    };
    
    document.querySelector('header').appendChild(installBtn);
});
