// API endpoints (в реальном приложении будут настоящие endpoints)
const API_BASE = 'http://localhost:5000/api';
const BOT_USERNAME = '@NeverVPNBot';

class NeverVPN {
    constructor() {
        this.userData = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Auth buttons
        document.getElementById('telegramLogin').addEventListener('click', () => this.showTelegramAuth());
        document.getElementById('registerBtn').addEventListener('click', () => this.showRegisterModal());
        
        // Modal controls
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        // Forms
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('confirmTelegramAuth').addEventListener('click', () => this.handleTelegramAuth());

        // Dashboard buttons
        document.getElementById('copyReferral').addEventListener('click', () => this.copyReferralLink());
        document.getElementById('shareReferral').addEventListener('click', () => this.shareReferralLink());
        document.getElementById('sidebarToggle').addEventListener('click', () => this.openSidebar());
        document.getElementById('closeSidebar').addEventListener('click', () => this.closeSidebar());
        document.getElementById('sidebarOverlay').addEventListener('click', () => this.closeSidebar());
        document.getElementById('logoutBtn').addEventListener('click', (e) => this.handleLogout(e));
        
        // VPN controls
        document.getElementById('connectVpn').addEventListener('click', () => this.showVPNInstructions());
        document.getElementById('addBalance').addEventListener('click', () => this.addBalance());
        document.getElementById('extendSubscription').addEventListener('click', () => this.extendSubscription());
        document.getElementById('transactionHistory').addEventListener('click', () => this.showTransactionHistory());

        // Copy buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.copy-btn')) {
                const button = e.target.closest('.copy-btn');
                const text = button.getAttribute('data-text');
                if (text) this.copyToClipboard(text);
            }
        });

        // Instructions
        document.querySelectorAll('.instruction-item').forEach(item => {
            item.addEventListener('click', () => {
                const platform = item.getAttribute('data-platform');
                this.showInstructions(platform);
            });
        });
    }

    async checkAuthStatus() {
        try {
            const token = localStorage.getItem('nevervpn_token');
            if (token) {
                const response = await this.apiCall('/user/profile');
                if (response.success) {
                    this.userData = response.data;
                    this.showDashboard();
                } else {
                    this.showLogin();
                }
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLogin();
        }
    }

    showLogin() {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('dashboardPage').style.display = 'none';
        this.closeAllModals();
    }

    showDashboard() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'block';
        this.updateDashboard();
    }

    updateDashboard() {
        if (!this.userData) return;

        // Update user info
        document.getElementById('userBalance').textContent = this.userData.balance || 0;
        document.getElementById('currentBalance').textContent = `${this.userData.balance || 0} руб`;
        document.getElementById('daysLeft').textContent = this.userData.days_left || 0;
        document.getElementById('userAvatar').textContent = this.userData.username ? this.userData.username[0].toUpperCase() : 'U';
        
        // Update referral info
        document.getElementById('referralLink').textContent = this.userData.referral_link || 'https://nevervpn.net/ref/...';
        document.getElementById('referralCount').textContent = this.userData.referral_count || 0;
        document.getElementById('referralEarnings').textContent = this.userData.referral_earnings || 0;
        
        // Update VPN status
        const vpnStatus = document.getElementById('vpnStatus');
        vpnStatus.textContent = this.userData.is_active ? 'Активен' : 'Неактивен';
        vpnStatus.className = this.userData.is_active ? 'status-value days-left' : 'status-value';

        // Update devices
        this.updateDevicesList();
    }

    updateDevicesList() {
        const devicesList = document.getElementById('devicesList');
        const devices = this.userData.devices || [];
        
        if (devices.length === 0) {
            devicesList.innerHTML = '<div class="device-item"><div class="device-info"><div class="device-name">Устройства не найдены</div></div></div>';
            return;
        }

        devicesList.innerHTML = devices.map(device => `
            <div class="device-item">
                <div class="device-icon">
                    <i class="fab fa-${this.getDeviceIcon(device.platform)}"></i>
                </div>
                <div class="device-info">
                    <div class="device-name">${device.name}</div>
                    <div class="device-status">${device.is_active ? 'Активно' : 'Неактивно'} • ${new Date(device.last_seen).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    }

    getDeviceIcon(platform) {
        const icons = {
            'windows': 'windows',
            'android': 'android',
            'ios': 'apple',
            'macos': 'apple',
            'linux': 'linux'
        };
        return icons[platform] || 'laptop';
    }

    showRegisterModal() {
        this.closeAllModals();
        document.getElementById('registerModal').classList.add('active');
    }

    showTelegramAuth() {
        this.closeAllModals();
        document.getElementById('telegramModal').classList.add('active');
    }

    showVPNInstructions() {
        if (!this.userData || !this.userData.is_active) {
            alert('Для подключения VPN необходимо активировать подписку');
            return;
        }
        
        this.closeAllModals();
        
        // Update VPN credentials
        document.getElementById('vpnUsername').textContent = this.userData.vpn_username || 'user_' + this.userData.id;
        document.getElementById('vpnPassword').textContent = '••••••••';
        
        document.getElementById('vpnModal').classList.add('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            const response = await this.apiCall('/auth/register', 'POST', data);
            
            if (response.success) {
                localStorage.setItem('nevervpn_token', response.data.token);
                this.userData = response.data.user;
                this.showDashboard();
                this.closeAllModals();
            } else {
                alert(response.message || 'Ошибка регистрации');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Ошибка соединения с сервером');
        }
    }

    async handleTelegramAuth() {
        const authCode = document.getElementById('authCode').value.trim();
        
        if (!authCode) {
            alert('Введите код авторизации');
            return;
        }

        try {
            const response = await this.apiCall('/auth/telegram', 'POST', { code: authCode });
            
            if (response.success) {
                localStorage.setItem('nevervpn_token', response.data.token);
                this.userData = response.data.user;
                this.showDashboard();
                this.closeAllModals();
            } else {
                alert(response.message || 'Неверный код авторизации');
            }
        } catch (error) {
            console.error('Telegram auth failed:', error);
            alert('Ошибка соединения с сервером');
        }
    }

    async handleLogout(e) {
        e.preventDefault();
        
        try {
            await this.apiCall('/auth/logout', 'POST');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('nevervpn_token');
            this.userData = null;
            this.showLogin();
            this.closeSidebar();
        }
    }

    async addBalance() {
        const amount = prompt('Введите сумму для пополнения (руб):');
        if (!amount || isNaN(amount) || amount <= 0) {
            alert('Введите корректную сумму');
            return;
        }

        try {
            const response = await this.apiCall('/payment/create', 'POST', { amount: parseFloat(amount) });
            
            if (response.success) {
                // В реальном приложении здесь будет редирект на платежную систему
                alert(`Платеж на ${amount} руб создан. В полной версии будет перенаправление на оплату.`);
                // Обновляем баланс
                this.userData.balance += parseFloat(amount);
                this.updateDashboard();
            } else {
                alert(response.message || 'Ошибка создания платежа');
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('Ошибка соединения с сервером');
        }
    }

    async extendSubscription() {
        const days = prompt('На сколько дней продлить подписку?');
        if (!days || isNaN(days) || days <= 0) {
            alert('Введите корректное количество дней');
            return;
        }

        const cost = days * 5; // 5 руб/день

        if (this.userData.balance < cost) {
            alert(`Недостаточно средств. Нужно: ${cost} руб, на балансе: ${this.userData.balance} руб`);
            return;
        }

        try {
            const response = await this.apiCall('/subscription/extend', 'POST', { days: parseInt(days) });
            
            if (response.success) {
                this.userData.balance -= cost;
                this.userData.days_left += parseInt(days);
                this.userData.is_active = true;
                this.updateDashboard();
                alert(`Подписка продлена на ${days} дней`);
            } else {
                alert(response.message || 'Ошибка продления подписки');
            }
        } catch (error) {
            console.error('Subscription error:', error);
            alert('Ошибка соединения с сервером');
        }
    }

    async showTransactionHistory() {
        try {
            const response = await this.apiCall('/user/transactions');
            
            if (response.success) {
                const transactions = response.data;
                let message = 'История операций:\n\n';
                
                transactions.forEach(transaction => {
                    const date = new Date(transaction.created_at).toLocaleDateString();
                    const type = transaction.type === 'deposit' ? 'Пополнение' : 'Списание';
                    const amount = transaction.amount + ' руб';
                    message += `${date} - ${type} - ${amount}\n`;
                });
                
                alert(message || 'Операций не найдено');
            } else {
                alert('Ошибка загрузки истории операций');
            }
        } catch (error) {
            console.error('Transactions error:', error);
            alert('Ошибка соединения с сервером');
        }
    }

    showInstructions(platform) {
        const instructions = {
            windows: 'Скачайте и установите OpenVPN Client...',
            android: 'Установите приложение OpenVPN из Google Play...',
            ios: 'Установите приложение OpenVPN Connect из App Store...',
            macos: 'Скачайте и установите Tunnelblick...'
        };
        
        alert(`Инструкции для ${platform}:\n\n${instructions[platform] || 'Инструкция в разработке'}`);
    }

    copyReferralLink() {
        const link = this.userData?.referral_link || 'https://nevervpn.net/ref/...';
        this.copyToClipboard(link);
        alert('Реферальная ссылка скопирована!');
    }

    shareReferralLink() {
        const link = this.userData?.referral_link || 'https://nevervpn.net/ref/...';
        const text = `Присоединяйся к NeverVPN Network! Безопасный и быстрый VPN. Используй мою ссылку: ${link}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'NeverVPN Network',
                text: text,
                url: link
            });
        } else {
            const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
            window.open(telegramUrl, '_blank');
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Copy failed:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        });
    }

    openSidebar() {
        document.getElementById('sidebar').classList.add('active');
        document.getElementById('sidebarOverlay').classList.add('active');
    }

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebarOverlay').classList.remove('active');
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const token = localStorage.getItem('nevervpn_token');
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(API_BASE + endpoint, options);
            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new NeverVPN();
});

// Эмуляция API для демонстрации
if (typeof window !== 'undefined') {
    window.mockAPI = {
        async call(endpoint, method, data) {
            console.log('API Call:', endpoint, method, data);
            
            // Имитация задержки сети
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const token = localStorage.getItem('nevervpn_token');
            
            if (endpoint === '/auth/register') {
                return {
                    success: true,
                    data: {
                        token: 'mock_jwt_token_' + Date.now(),
                        user: {
                            id: 1,
                            username: data.username,
                            email: data.email,
                            balance: 0,
                            days_left: 0,
                            is_active: false,
                            referral_link: 'https://nevervpn.net/ref/user_' + Date.now(),
                            referral_count: 0,
                            referral_earnings: 0,
                            devices: []
                        }
                    }
                };
            }
            
            if (endpoint === '/auth/telegram') {
                if (data.code === '123456') {
                    return {
                        success: true,
                        data: {
                            token: 'mock_jwt_token_telegram',
                            user: {
                                id: 2,
                                username: 'telegram_user',
                                email: null,
                                balance: 100,
                                days_left: 30,
                                is_active: true,
                                referral_link: 'https://nevervpn.net/ref/tg_' + Date.now(),
                                referral_count: 3,
                                referral_earnings: 45,
                                vpn_username: 'tg_user_123',
                                devices: [
                                    {
                                        name: 'Android Phone',
                                        platform: 'android',
                                        is_active: true,
                                        last_seen: new Date().toISOString()
                                    }
                                ]
                            }
                        }
                    };
                } else {
                    return {
                        success: false,
                        message: 'Неверный код авторизации'
                    };
                }
            }
            
            if (endpoint === '/user/profile' && token) {
                return {
                    success: true,
                    data: {
                        id: 1,
                        username: 'demo_user',
                        email: 'demo@example.com',
                        balance: 100,
                        days_left: 20,
                        is_active: true,
                        referral_link: 'https://nevervpn.net/ref/demo123',
                        referral_count: 5,
                        referral_earnings: 50,
                        vpn_username: 'user_demo',
                        devices: [
                            {
                                name: 'Windows PC',
                                platform: 'windows',
                                is_active: true,
                                last_seen: new Date(Date.now() - 86400000).toISOString()
                            },
                            {
                                name: 'Android Phone',
                                platform: 'android',
                                is_active: false,
                                last_seen: new Date(Date.now() - 172800000).toISOString()
                            }
                        ]
                    }
                };
            }
            
            return {
                success: false,
                message: 'Endpoint not implemented'
            };
        }
    };
    
    // Переопределяем apiCall для демонстрации
    NeverVPN.prototype.apiCall = async function(endpoint, method = 'GET', data = null) {
        return await window.mockAPI.call(endpoint, method, data);
    };
}