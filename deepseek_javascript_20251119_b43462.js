class VPNApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.user = null;
        this.balance = 0;
        this.daysLeft = 0;
        this.init();
    }

    init() {
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        
        this.initUser();
        this.initEventListeners();
        this.loadUserData();
        this.render();
    }

    initUser() {
        const initData = this.tg.initDataUnsafe;
        this.user = {
            id: initData.user?.id || 123456789,
            firstName: initData.user?.first_name || 'Тестовый',
            lastName: initData.user?.last_name || 'Пользователь',
            username: initData.user?.username || 'testuser',
            photoUrl: initData.user?.photo_url || ''
        };

        // Сохраняем пользователя в localStorage для демо
        if (!localStorage.getItem('vpn_user')) {
            const userData = {
                ...this.user,
                balance: 0,
                daysLeft: 0,
                devices: [],
                history: [],
                referrals: [],
                refCode: this.generateRefCode()
            };
            localStorage.setItem('vpn_user', JSON.stringify(userData));
        }
    }

    generateRefCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    loadUserData() {
        const userData = JSON.parse(localStorage.getItem('vpn_user') || '{}');
        this.balance = userData.balance || 0;
        this.daysLeft = userData.daysLeft || 0;
        this.userData = userData;
    }

    saveUserData() {
        localStorage.setItem('vpn_user', JSON.stringify(this.userData));
    }

    initEventListeners() {
        // Menu
        document.getElementById('menuBtn').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('overlay').addEventListener('click', () => this.toggleSidebar());

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            if (!item.id) {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = item.getAttribute('data-section');
                    if (section) {
                        this.showSection(section);
                        this.toggleSidebar();
                    }
                });
            }
        });

        // Special buttons
        document.getElementById('supportBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.openSupport();
        });

        document.getElementById('rulesBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRules();
        });

        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Actions
        document.getElementById('topupBtn').addEventListener('click', () => this.showTopupModal());
        document.getElementById('activateBtn').addEventListener('click', () => this.activateVPN());
        document.getElementById('copyRefBtn').addEventListener('click', () => this.copyRefLink());
        document.getElementById('shareRefBtn').addEventListener('click', () => this.shareRefLink());

        // Modals
        document.getElementById('closeTopupModal').addEventListener('click', () => this.hideTopupModal());
        document.getElementById('closeInstructionModal').addEventListener('click', () => this.hideInstructionModal());
        document.getElementById('confirmTopup').addEventListener('click', () => this.confirmTopup());

        // Amount options
        document.querySelectorAll('.amount-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.amount-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                document.getElementById('customAmount').value = '';
            });
        });

        document.getElementById('customAmount').addEventListener('input', (e) => {
            document.querySelectorAll('.amount-option').forEach(opt => opt.classList.remove('active'));
        });

        // Instruction cards
        document.querySelectorAll('.instruction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.instruction-card');
                const platform = card.getAttribute('data-platform');
                this.showInstruction(platform);
            });
        });

        // History filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterHistory(btn.getAttribute('data-filter'));
            });
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show target section
        document.getElementById(sectionName).classList.add('active');

        // Add active class to corresponding nav item
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'devices':
                this.loadDevices();
                break;
            case 'referral':
                this.loadReferralData();
                break;
            case 'history':
                this.loadHistory();
                break;
        }
    }

    render() {
        // Update user info
        document.getElementById('userName').textContent = `${this.user.firstName} ${this.user.lastName}`;
        document.getElementById('userDays').textContent = `Дней осталось: ${this.daysLeft}`;
        
        if (this.user.photoUrl) {
            document.getElementById('userAvatar').src = this.user.photoUrl;
        }

        // Update balance
        document.getElementById('balance').textContent = `${this.balance} ₽`;
        document.getElementById('dashboardBalance').textContent = `${this.balance} ₽`;
        document.getElementById('dashboardDays').textContent = this.daysLeft;

        // Update VPN status
        const statusElement = document.getElementById('vpnStatus');
        statusElement.textContent = this.daysLeft > 0 ? 'Активен' : 'Неактивен';
        statusElement.className = `status-badge ${this.daysLeft > 0 ? 'active' : 'inactive'}`;

        // Update quick stats
        document.getElementById('refCount').textContent = this.userData.referrals?.length || 0;
        document.getElementById('deviceCount').textContent = this.userData.devices?.length || 0;
    }

    showTopupModal() {
        document.getElementById('topupModal').classList.add('active');
    }

    hideTopupModal() {
        document.getElementById('topupModal').classList.remove('active');
    }

    confirmTopup() {
        let amount = 0;
        
        // Check selected amount option
        const selectedOption = document.querySelector('.amount-option.active');
        if (selectedOption) {
            amount = parseInt(selectedOption.getAttribute('data-amount'));
        } else {
            // Check custom amount
            const customAmount = document.getElementById('customAmount').value;
            amount = parseInt(customAmount);
        }

        if (amount < 50) {
            alert('Минимальная сумма пополнения - 50 ₽');
            return;
        }

        // In real app, here would be payment processing
        this.balance += amount;
        this.userData.balance = this.balance;
        
        // Add to history
        this.userData.history = this.userData.history || [];
        this.userData.history.unshift({
            type: 'topup',
            amount: amount,
            date: new Date().toISOString(),
            description: 'Пополнение баланса'
        });

        this.saveUserData();
        this.render();
        this.hideTopupModal();
        
        alert(`Баланс пополнен на ${amount} ₽`);
    }

    activateVPN() {
        const costPerDay = 5;
        const maxDays = Math.floor(this.balance / costPerDay);

        if (maxDays === 0) {
            alert('Недостаточно средств. Пополните баланс.');
            this.showTopupModal();
            return;
        }

        const days = prompt(`Введите количество дней (максимум ${maxDays}):`, '30');
        const daysNum = parseInt(days);

        if (daysNum > 0 && daysNum <= maxDays) {
            const cost = daysNum * costPerDay;
            this.balance -= cost;
            this.daysLeft += daysNum;
            
            this.userData.balance = this.balance;
            this.userData.daysLeft = this.daysLeft;

            // Add to history
            this.userData.history.unshift({
                type: 'payment',
                amount: -cost,
                date: new Date().toISOString(),
                description: `Оплата VPN на ${daysNum} дней`
            });

            this.saveUserData();
            this.render();
            alert(`VPN активирован на ${daysNum} дней!`);
        }
    }

    loadDevices() {
        const devicesList = document.getElementById('devicesList');
        const devices = this.userData.devices || [];
        
        if (devices.length === 0) {
            devicesList.innerHTML = `
                <div class="section-note">
                    📱 У вас пока нет подключенных устройств. После активации VPN здесь появятся ваши устройства.
                </div>
            `;
            return;
        }

        devicesList.innerHTML = devices.map(device => `
            <div class="device-item">
                <div class="device-icon">${this.getDeviceIcon(device.type)}</div>
                <div class="device-info">
                    <span class="device-name">${device.name}</span>
                    <span class="device-details">${device.ip} • ${new Date(device.lastSeen).toLocaleDateString()}</span>
                </div>
                <div class="device-status ${device.active ? 'active' : 'inactive'}">
                    ${device.active ? 'Online' : 'Offline'}
                </div>
            </div>
        `).join('');
    }

    getDeviceIcon(type) {
        const icons = {
            'ios': '📱',
            'android': '🤖',
            'windows': '🪟',
            'macos': '🍎',
            'linux': '🐧'
        };
        return icons[type] || '💻';
    }

    loadReferralData() {
        const referrals = this.userData.referrals || [];
        const totalEarnings = referrals.reduce((sum, ref) => sum + (ref.earnings || 0), 0);

        document.getElementById('totalRefs').textContent = referrals.length;
        document.getElementById('refEarnings').textContent = `${totalEarnings} ₽`;
        
        const refLink = `https://t.me/your_bot?start=ref_${this.userData.refCode}`;
        document.getElementById('refLink').value = refLink;
    }

    copyRefLink() {
        const refLinkInput = document.getElementById('refLink');
        refLinkInput.select();
        document.execCommand('copy');
        
        // Show confirmation
        const btn = document.getElementById('copyRefBtn');
        const originalText = btn.textContent;
        btn.textContent = '✅';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }

    shareRefLink() {
        const refLink = document.getElementById('refLink').value;
        const text = `Привет! Подключайся к надежному VPN через мое приложение. По моей ссылке ты получишь +50 ₽ на баланс! ${refLink}`;
        
        // In Telegram Web App, we can use share functionality
        if (this.tg.isVersionAtLeast('6.1')) {
            this.tg.shareText(text);
        } else {
            // Fallback - copy to clipboard and show message
            navigator.clipboard.writeText(text).then(() => {
                alert('Реферальная ссылка скопирована! Теперь вы можете поделиться ею в Telegram.');
            });
        }
    }

    loadHistory() {
        const historyList = document.getElementById('historyList');
        const history = this.userData.history || [];
        
        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="section-note">
                    📋 История операций пуста
                </div>
            `;
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-description">${item.description}</div>
                    <div class="history-date">${new Date(item.date).toLocaleDateString()}</div>
                </div>
                <div class="history-amount ${item.amount > 0 ? 'positive' : 'negative'}">
                    ${item.amount > 0 ? '+' : ''}${item.amount} ₽
                </div>
            </div>
        `).join('');
    }

    filterHistory(filter) {
        // Implementation would filter the history list
        // For demo, we'll just reload all history
        this.loadHistory();
    }

    showInstruction(platform) {
        const instructions = {
            'ios': {
                title: 'Установка на iOS',
                content: `
                    <h4>Инструкция для iPhone/iPad:</h4>
                    <ol>
                        <li>Откройте App Store</li>
                        <li>Найдите приложение WireGuard</li>
                        <li>Скачайте и установите приложение</li>
                        <li>В нашем приложении нажмите "Экспорт конфигурации"</li>
                        <li>Импортируйте конфигурацию в WireGuard</li>
                        <li>Активируйте подключение</li>
                    </ol>
                `
            },
            'android': {
                title: 'Установка на Android',
                content: `
                    <h4>Инструкция для Android:</h4>
                    <ol>
                        <li>Откройте Google Play Market</li>
                        <li>Найдите приложение WireGuard</li>
                        <li>Скачайте и установите приложение</li>
                        <li>В нашем приложении нажмите "Экспорт конфигурации"</li>
                        <li>Импортируйте конфигурацию в WireGuard</li>
                        <li>Активируйте подключение</li>
                    </ol>
                `
            },
            'windows': {
                title: 'Установка на Windows',
                content: `
                    <h4>Инструкция для Windows:</h4>
                    <ol>
                        <li>Скачайте WireGuard с официального сайта</li>
                        <li>Установите программу</li>
                        <li>В нашем приложении нажмите "Экспорт конфигурации"</li>
                        <li>Импортируйте конфигурацию в WireGuard</li>
                        <li>Активируйте подключение</li>
                    </ol>
                `
            },
            'macos': {
                title: 'Установка на macOS',
                content: `
                    <h4>Инструкция для Mac:</h4>
                    <ol>
                        <li>Откройте App Store</li>
                        <li>Найдите приложение WireGuard</li>
                        <li>Скачайте и установите приложение</li>
                        <li>В нашем приложении нажмите "Экспорт конфигурации"</li>
                        <li>Импортируйте конфигурацию в WireGuard</li>
                        <li>Активируйте подключение</li>
                    </ol>
                `
            }
        };

        const instruction = instructions[platform];
        if (instruction) {
            document.getElementById('instructionTitle').textContent = instruction.title;
            document.getElementById('instructionContent').innerHTML = instruction.content;
            document.getElementById('instructionModal').classList.add('active');
        }
    }

    hideInstructionModal() {
        document.getElementById('instructionModal').classList.remove('active');
    }

    openSupport() {
        // Open support bot in Telegram
        this.tg.openTelegramLink('https://t.me/your_support_bot');
    }

    showRules() {
        alert(`Правила использования VPN сервиса:

1. Запрещено использование для незаконной деятельности
2. Максимальное количество устройств: 5
3. Автоматическое списание 5 ₽ в день
4. Возврат средств не предусмотрен
5. Администрация вправе заблокировать аккаунт за нарушения

Полные правила: https://your-vpn-service.com/rules`);
    }

    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('vpn_user');
            this.tg.close();
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VPNApp();
});