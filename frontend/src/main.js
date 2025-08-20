import './style.css';

// Импорт Wails runtime
import { GetCurrentDirectory, CheckProxiFyreExists, GetConfig, SaveConfig, RunProxiFyre, StopProxiFyre, DownloadProxiFyre, InstallService, UninstallService, StartService, StopService, GetServiceStatus, GetTimestamp } from '../wailsjs/go/main/App';

// Глобальные переменные
let currentConfig = null;
let currentApps = [];
let isInitialized = false; // Флаг для предотвращения повторной инициализации

// Вспомогательная функция для обработки ошибок
function getErrorMessage(error) {
    let errorMessage = 'Неизвестная ошибка';
    if (error && typeof error === 'object') {
        if (error.message) {
            errorMessage = error.message;
        } else if (error.error) {
            errorMessage = error.error;
        } else if (error.toString) {
            errorMessage = error.toString();
        }
    } else if (error) {
        errorMessage = String(error);
    }
    return errorMessage;
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Инициализация приложения
async function initializeApp() {
    if (isInitialized) {
        return; // Предотвращаем повторную инициализацию
    }
    
    try {
        logToConsole('🚀 ProxiFyre Configuration Editor запущен');
        
        // Проверяем текущую директорию
        const currentDir = await GetCurrentDirectory();
        console.log('Текущая директория:', currentDir);
        
        // Загружаем конфигурацию
        await loadCurrentConfig();
        
        // Проверяем статус ProxiFyre
        await checkProxiFyreStatus();
        
        isInitialized = true;
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        logToConsole(`❌ Ошибка инициализации: ${error.message}`);
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Переключение вкладок
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Кнопки управления
    const saveBtn = document.getElementById('saveBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveConfiguration);
        console.log('✅ Обработчик для кнопки "Сохранить" добавлен');
    } else {
        console.error('❌ Кнопка "Сохранить" не найдена');
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadCurrentConfig);
        console.log('✅ Обработчик для кнопки "Обновить" добавлен');
    } else {
        console.error('❌ Кнопка "Обновить" не найдена');
    }

    // Кнопки управления приложением
    const runBtn = document.getElementById('runBtn');
    const stopBtn = document.getElementById('stopBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (runBtn) {
        runBtn.addEventListener('click', runProxiFyre);
        console.log('✅ Обработчик для кнопки "Запустить" добавлен');
    } else {
        console.error('❌ Кнопка "Запустить" не найдена');
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopProxiFyre);
        console.log('✅ Обработчик для кнопки "Остановить" добавлен');
    } else {
        console.error('❌ Кнопка "Остановить" не найдена');
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadProxiFyre);
        console.log('✅ Обработчик для кнопки "Скачать" добавлен');
    } else {
        console.error('❌ Кнопка "Скачать" не найдена');
    }

    // Кнопки управления приложениями
    const addAppBtn = document.getElementById('addAppBtn');
    
    if (addAppBtn) {
        addAppBtn.addEventListener('click', addApplication);
        console.log('✅ Обработчик для кнопки "Добавить" добавлен');
    } else {
        console.error('❌ Кнопка "Добавить" не найдена');
    }

    // Кнопки управления консолью
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    const copyConsoleBtn = document.getElementById('copyConsoleBtn');
    
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', clearConsole);
        console.log('✅ Обработчик для кнопки "Очистить" добавлен');
    } else {
        console.error('❌ Кнопка "Очистить" не найдена');
    }
    
    if (copyConsoleBtn) {
        copyConsoleBtn.addEventListener('click', copyConsoleOutput);
        console.log('✅ Обработчик для кнопки "Копировать" добавлен');
    } else {
        console.error('❌ Кнопка "Копировать" не найдена');
    }

    // Кнопки управления сервисом
    const installServiceBtn = document.getElementById('installServiceBtn');
    const uninstallServiceBtn = document.getElementById('uninstallServiceBtn');
    const startServiceBtn = document.getElementById('startServiceBtn');
    const stopServiceBtn = document.getElementById('stopServiceBtn');
    const refreshStatusBtn = document.getElementById('refreshStatusBtn');
    
    if (installServiceBtn) {
        installServiceBtn.addEventListener('click', installService);
        console.log('✅ Обработчик для кнопки "Установить сервис" добавлен');
    } else {
        console.error('❌ Кнопка "Установить сервис" не найдена');
    }
    
    if (uninstallServiceBtn) {
        uninstallServiceBtn.addEventListener('click', uninstallService);
        console.log('✅ Обработчик для кнопки "Удалить сервис" добавлен');
    } else {
        console.error('❌ Кнопка "Удалить сервис" не найдена');
    }
    
    if (startServiceBtn) {
        startServiceBtn.addEventListener('click', startService);
        console.log('✅ Обработчик для кнопки "Запустить сервис" добавлен');
    } else {
        console.error('❌ Кнопка "Запустить сервис" не найдена');
    }
    
    if (stopServiceBtn) {
        stopServiceBtn.addEventListener('click', stopService);
        console.log('✅ Обработчик для кнопки "Остановить сервис" добавлен');
    } else {
        console.error('❌ Кнопка "Остановить сервис" не найдена');
    }
    
    if (refreshStatusBtn) {
        refreshStatusBtn.addEventListener('click', updateServiceStatus);
        console.log('✅ Обработчик для кнопки "Обновить статус" добавлен');
    } else {
        console.error('❌ Кнопка "Обновить статус" не найдена');
    }

    // Обработчики изменения полей
    const endpoint = document.getElementById('endpoint');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const logLevel = document.getElementById('logLevel');
    
    if (endpoint) {
        endpoint.addEventListener('input', updateConfigFromUI);
        console.log('✅ Обработчик для поля "endpoint" добавлен');
    }
    
    if (username) {
        username.addEventListener('input', updateConfigFromUI);
        console.log('✅ Обработчик для поля "username" добавлен');
    }
    
    if (password) {
        password.addEventListener('input', updateConfigFromUI);
        console.log('✅ Обработчик для поля "password" добавлен');
    }
    
    if (logLevel) {
        logLevel.addEventListener('change', updateConfigFromUI);
        console.log('✅ Обработчик для поля "logLevel" добавлен');
    }
    
    console.log('Настройка обработчиков событий завершена');
}

// Переключение вкладок
function switchTab(tabName) {
    // Убираем активный класс со всех вкладок
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Активируем выбранную вкладку
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Загрузка текущей конфигурации
async function loadCurrentConfig() {
    try {
        const configData = await GetConfig();
        currentConfig = JSON.parse(configData);
        
        // Обновляем UI
        updateUIFromConfig();
        
        // Выводим сообщение только если это не инициализация
        if (isInitialized) {
            logToConsole('✅ Конфигурация загружена');
        }
    } catch (error) {
        console.error('Ошибка загрузки конфигурации:', error);
        logToConsole(`❌ Ошибка загрузки конфигурации: ${error.message}`);
    }
}

// Обновление UI из конфигурации
function updateUIFromConfig() {
    if (!currentConfig || !currentConfig.proxies || currentConfig.proxies.length === 0) {
        return;
    }

    const proxy = currentConfig.proxies[0];
    
    // Обновляем поля прокси
    document.getElementById('endpoint').value = proxy.socks5ProxyEndpoint || '';
    document.getElementById('username').value = proxy.username || '';
    document.getElementById('password').value = proxy.password || '';
    
    // Обновляем уровень логирования
    const logLevelSelect = document.getElementById('logLevel');
    const logLevel = currentConfig.logLevel || 'Error';
    for (let i = 0; i < logLevelSelect.options.length; i++) {
        if (logLevelSelect.options[i].value === logLevel) {
            logLevelSelect.selectedIndex = i;
            break;
        }
    }
    
    // Обновляем список приложений
    currentApps = proxy.appNames || [];
    updateAppsDisplay();
}

// Обновление конфигурации из UI
function updateConfigFromUI() {
    if (!currentConfig) {
        currentConfig = {
            logLevel: "Error",
            proxies: [{
                appNames: [],
                socks5ProxyEndpoint: "",
                username: "",
                password: "",
                supportedProtocols: ["TCP", "UDP"]
            }]
        };
    }

    // Обновляем настройки прокси
    currentConfig.logLevel = document.getElementById('logLevel').value;
    
    if (!currentConfig.proxies) {
        currentConfig.proxies = [{}];
    }
    
    const proxy = currentConfig.proxies[0];
    proxy.socks5ProxyEndpoint = document.getElementById('endpoint').value;
    proxy.username = document.getElementById('username').value;
    proxy.password = document.getElementById('password').value;
    proxy.appNames = currentApps;
    
    if (!proxy.supportedProtocols) {
        proxy.supportedProtocols = ["TCP", "UDP"];
    }
}

// Сохранение конфигурации
async function saveConfiguration() {
    try {
        updateConfigFromUI();
        
        const configData = JSON.stringify(currentConfig);
        await SaveConfig(configData);
        
        logToConsole('💾 Конфигурация сохранена');
        showNotification('Конфигурация успешно сохранена!', 'success');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        
        // Улучшенная обработка ошибок
        const errorMessage = getErrorMessage(error);
        console.log('📝 Обработанная ошибка:', errorMessage);
        logToConsole(`❌ Ошибка сохранения: ${errorMessage}`);
        showNotification(`Ошибка сохранения: ${errorMessage}`, 'error');
    }
}

// Обновление отображения приложений
function updateAppsDisplay() {
    const appsList = document.getElementById('appsList');
    appsList.innerHTML = '';
    
    currentApps.forEach((app, index) => {
        const appItem = document.createElement('div');
        appItem.className = 'app-item';
        
        // Создаем span с именем приложения
        const appSpan = document.createElement('span');
        appSpan.textContent = `• ${app}`;
        
        // Создаем кнопку удаления
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-sm';
        removeBtn.textContent = '✕';
        removeBtn.setAttribute('data-index', index);
        
        // Добавляем обработчик события для кнопки удаления
        removeBtn.addEventListener('click', function() {
            const buttonIndex = parseInt(this.getAttribute('data-index'));
            console.log('🔄 Клик по кнопке удаления, индекс:', buttonIndex);
            removeAppByIndex(buttonIndex);
        });
        
        // Добавляем элементы в appItem
        appItem.appendChild(appSpan);
        appItem.appendChild(removeBtn);
        
        appsList.appendChild(appItem);
    });
}

// Добавление приложения
async function addApplication() {
    console.log('🔄 Функция addApplication вызвана');
    try {
        // Создаем скрытый input для выбора файла
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.exe,.msi,.bat,.cmd,.com'; // Принимаем исполняемые файлы
        fileInput.style.display = 'none';
        
        // Добавляем обработчик события выбора файла
        fileInput.onchange = function(event) {
            const file = event.target.files[0];
            if (file) {
                const fileName = file.name;
                console.log('📁 Выбран файл:', fileName);
                
                if (!currentApps.includes(fileName)) {
                    currentApps.push(fileName);
                    console.log('✅ Приложение добавлено в массив:', fileName);
                    updateAppsDisplay();
                    updateConfigFromUI();
                    logToConsole(`✅ Приложение '${fileName}' добавлено`);
                    showNotification(`Приложение '${fileName}' добавлено!`, 'success');
                } else {
                    console.log('⚠️ Приложение уже существует в списке');
                    showNotification('Это приложение уже добавлено в список!', 'warning');
                }
            }
            
            // Очищаем input для возможности повторного выбора того же файла
            fileInput.value = '';
        };
        
        // Добавляем input в DOM и вызываем диалог выбора файла
        document.body.appendChild(fileInput);
        fileInput.click();
        
        // Удаляем input из DOM после использования
        setTimeout(() => {
            if (fileInput.parentNode) {
                fileInput.parentNode.removeChild(fileInput);
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Ошибка в addApplication:', error);
        logToConsole(`❌ Ошибка добавления приложения: ${error.message}`);
    }
}



// Удаление приложения по индексу
function removeAppByIndex(index) {
    console.log('🔄 Функция removeAppByIndex вызвана с индексом:', index);
    
    if (index >= 0 && index < currentApps.length) {
        const appName = currentApps[index];
        console.log('📝 Удаляю приложение:', appName);
        
        currentApps.splice(index, 1);
        updateAppsDisplay();
        updateConfigFromUI();
        
        logToConsole(`✅ Приложение '${appName}' удалено`);
        showNotification(`Приложение '${appName}' удалено!`, 'success');
        
        console.log('✅ Приложение успешно удалено из массива');
    } else {
        console.error('❌ Некорректный индекс для удаления:', index);
        showNotification('Ошибка: некорректный индекс приложения!', 'error');
    }
}

// Запуск ProxiFyre
async function runProxiFyre() {
    console.log('🔄 Функция runProxiFyre вызвана');
    try {
        logToConsole('🚀 Запуск ProxiFyre...');
        console.log('📞 Вызываю RunProxiFyre() из Go backend...');
        
        await RunProxiFyre();
        
        console.log('✅ RunProxiFyre() выполнен успешно');
        logToConsole('✅ ProxiFyre запущен!');
        showNotification('ProxiFyre успешно запущен!', 'success');
    } catch (error) {
        console.error('❌ Ошибка в runProxiFyre:', error);
        
        // Улучшенная обработка ошибок
        const errorMessage = getErrorMessage(error);
        console.log('📝 Обработанная ошибка:', errorMessage);
        logToConsole(`❌ Ошибка запуска: ${errorMessage}`);
        showNotification(`Ошибка запуска: ${errorMessage}`, 'error');
    }
}

// Остановка ProxiFyre
async function stopProxiFyre() {
    console.log('🔄 Функция stopProxiFyre вызвана');
    try {
        logToConsole('🛑 Остановка ProxiFyre...');
        console.log('📞 Вызываю StopProxiFyre() из Go backend...');
        
        await StopProxiFyre();
        
        console.log('✅ StopProxiFyre() выполнен успешно');
        logToConsole('✅ ProxiFyre остановлен!');
        showNotification('ProxiFyre успешно остановлен!', 'success');
    } catch (error) {
        console.error('❌ Ошибка в stopProxiFyre:', error);
        
        // Улучшенная обработка ошибок
        const errorMessage = getErrorMessage(error);
        console.log('📝 Обработанная ошибка:', errorMessage);
        logToConsole(`❌ Ошибка остановки: ${errorMessage}`);
        showNotification(`Ошибка остановки: ${errorMessage}`, 'error');
    }
}

// Скачивание ProxiFyre
async function downloadProxiFyre() {
    console.log('🔄 Функция downloadProxiFyre вызвана');
    try {
        logToConsole('⬇️ Начинаю загрузку ProxiFyre...');
        console.log('📞 Вызываю DownloadProxiFyre() из Go backend...');
        
        await DownloadProxiFyre();
        
        console.log('✅ DownloadProxiFyre() выполнен успешно');
        logToConsole('✅ ProxiFyre загружен!');
        showNotification('ProxiFyre успешно загружен!', 'success');
    } catch (error) {
        console.error('❌ Ошибка в downloadProxiFyre:', error);
        
        // Улучшенная обработка ошибок
        const errorMessage = getErrorMessage(error);
        console.log('📝 Обработанная ошибка:', errorMessage);
        logToConsole(`❌ Ошибка загрузки: ${errorMessage}`);
        showNotification(`Ошибка загрузки: ${errorMessage}`, 'error');
    }
}

// Установка сервиса
async function installService() {
    try {
        logToConsole('📥 Установка сервиса ProxiFyre...');
        
        await InstallService();
        
        logToConsole('✅ Сервис ProxiFyre установлен!');
        showNotification('Сервис ProxiFyre установлен!', 'success');
        await updateServiceStatus();
    } catch (error) {
        console.error('Ошибка установки сервиса:', error);
        logToConsole(`❌ Ошибка установки сервиса: ${error.message}`);
        showNotification(`Ошибка установки сервиса: ${error.message}`, 'error');
    }
}

// Удаление сервиса
async function uninstallService() {
    try {
        logToConsole('🗑️ Удаление сервиса ProxiFyre...');
        
        await UninstallService();
        
        logToConsole('✅ Сервис ProxiFyre удален!');
        showNotification('Сервис ProxiFyre удален!', 'success');
        await updateServiceStatus();
    } catch (error) {
        console.error('Ошибка удаления сервиса:', error);
        logToConsole(`❌ Ошибка удаления сервиса: ${error.message}`);
        showNotification(`Ошибка удаления сервиса: ${error.message}`, 'error');
    }
}

// Запуск сервиса
async function startService() {
    try {
        logToConsole('▶️ Запуск сервиса ProxiFyre...');
        
        await StartService();
        
        logToConsole('✅ Сервис ProxiFyre запущен!');
        showNotification('Сервис ProxiFyre запущен!', 'success');
        await updateServiceStatus();
    } catch (error) {
        console.error('Ошибка запуска сервиса:', error);
        logToConsole(`❌ Ошибка запуска сервиса: ${error.message}`);
        showNotification(`Ошибка запуска сервиса: ${error.message}`, 'error');
    }
}

// Остановка сервиса
async function stopService() {
    try {
        logToConsole('⏹️ Остановка сервиса ProxiFyre...');
        
        await StopService();
        
        logToConsole('✅ Сервис ProxiFyre остановлен!');
        showNotification('Сервис ProxiFyre остановлен!', 'success');
        await updateServiceStatus();
    } catch (error) {
        console.error('Ошибка остановки сервиса:', error);
        logToConsole(`❌ Ошибка остановки сервиса: ${error.message}`);
        showNotification(`Ошибка остановки сервиса: ${error.message}`, 'error');
    }
}

// Обновление статуса сервиса
async function updateServiceStatus() {
    try {
        const status = await GetServiceStatus();
        const statusElement = document.getElementById('serviceStatus');
        
        statusElement.textContent = `Статус: ${status}`;
        
        // Обновляем цвет в зависимости от статуса
        statusElement.className = '';
        if (status.includes('Запущен')) {
            statusElement.style.color = 'green';
            statusElement.style.fontWeight = 'bold';
        } else if (status.includes('Остановлен')) {
            statusElement.style.color = 'red';
            statusElement.style.fontWeight = 'bold';
        } else if (status.includes('Неизвестно')) {
            statusElement.style.color = 'orange';
            statusElement.style.fontWeight = 'bold';
        } else {
            statusElement.style.color = 'gray';
        }
        
        logToConsole(`📊 Статус сервиса обновлен: ${status}`);
    } catch (error) {
        console.error('Ошибка обновления статуса сервиса:', error);
        logToConsole(`❌ Ошибка обновления статуса сервиса: ${error.message}`);
    }
}

// Проверка статуса ProxiFyre
async function checkProxiFyreStatus() {
    try {
        const exists = await CheckProxiFyreExists();
        if (exists) {
            // Выводим сообщение только если это не инициализация
            if (isInitialized) {
                logToConsole('✅ ProxiFyre.exe найден в текущей директории');
            }
        } else {
            logToConsole('⚠️ ProxiFyre.exe не найден в текущей директории');
        }
    } catch (error) {
        console.error('Ошибка проверки статуса ProxiFyre:', error);
        logToConsole(`❌ Ошибка проверки статуса ProxiFyre: ${error.message}`);
    }
}

// Логирование в консоль
function logToConsole(message) {
    const console = document.getElementById('console');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    console.appendChild(logEntry);
    
    // Прокручиваем к концу
    console.scrollTop = console.scrollHeight;
}

// Очистка консоли
function clearConsole() {
    document.getElementById('console').innerHTML = '';
    logToConsole('🧹 Консоль очищена');
}

// Копирование содержимого консоли
function copyConsoleOutput() {
    const console = document.getElementById('console');
    const text = console.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Содержимое консоли скопировано в буфер обмена!', 'success');
    }).catch(() => {
        showNotification('Не удалось скопировать содержимое консоли', 'error');
    });
}

// Показ уведомлений
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Добавляем стили
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    // Цвета для разных типов
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#28a745';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ffc107';
            notification.style.color = '#333';
            break;
        default:
            notification.style.backgroundColor = '#007bff';
    }
    
    // Добавляем в DOM
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Добавляем CSS анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Автообновление статуса сервиса каждые 10 секунд - УБИРАЕМ
// setInterval(updateServiceStatus, 10000);

// Логируем запуск приложения
//logToConsole('🚀 ProxiFyre Configuration Editor запущен');
