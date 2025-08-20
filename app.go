package main

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

// Config структура конфигурации
type Config struct {
	LogLevel string  `json:"logLevel"`
	Proxies  []Proxy `json:"proxies"`
}

// Proxy структура прокси
type Proxy struct {
	AppNames            []string `json:"appNames"`
	Socks5ProxyEndpoint string   `json:"socks5ProxyEndpoint"`
	Username            string   `json:"username"`
	Password            string   `json:"password"`
	SupportedProtocols  []string `json:"supportedProtocols"`
}

// App struct
type App struct {
	ctx    context.Context
	config *Config
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		config: &Config{
			LogLevel: "Error",
			Proxies: []Proxy{
				{
					AppNames:            []string{},
					Socks5ProxyEndpoint: "",
					Username:            "",
					Password:            "",
					SupportedProtocols:  []string{"TCP", "UDP"},
				},
			},
		},
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Проверяем, что конфигурация находится в правильной директории
	if err := a.EnsureConfigInExecutableDir(); err != nil {
		fmt.Printf("⚠️ Предупреждение: %v\n", err)
	}

	a.loadConfig()
}

// LoadConfig загружает конфигурацию из файла
func (a *App) loadConfig() {
	configPath := a.GetConfigPath()
	if _, err := os.Stat(configPath); err == nil {
		data, err := ioutil.ReadFile(configPath)
		if err == nil {
			json.Unmarshal(data, &a.config)
		}
	}
}

// SaveConfig сохраняет конфигурацию в файл
func (a *App) SaveConfig(configData string) error {
	var config Config
	if err := json.Unmarshal([]byte(configData), &config); err != nil {
		return err
	}

	a.config = &config

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	configPath := a.GetConfigPath()
	return ioutil.WriteFile(configPath, data, 0644)
}

// GetConfig возвращает текущую конфигурацию
func (a *App) GetConfig() string {
	data, _ := json.Marshal(a.config)
	return string(data)
}

// GetCurrentDirectory возвращает текущую директорию
func (a *App) GetCurrentDirectory() string {
	dir, _ := os.Getwd()
	return dir
}

// GetExecutableDirectory возвращает директорию, где находится исполняемый файл
func (a *App) GetExecutableDirectory() string {
	executable, err := os.Executable()
	if err != nil {
		return a.GetCurrentDirectory()
	}
	return filepath.Dir(executable)
}

// EnsureConfigInExecutableDir проверяет, что конфигурация находится в той же директории, что и исполняемый файл
func (a *App) EnsureConfigInExecutableDir() error {
	execDir := a.GetExecutableDirectory()
	currentDir := a.GetCurrentDirectory()

	// Если мы не в директории исполняемого файла, копируем конфигурацию туда
	if execDir != currentDir {
		sourceConfig := filepath.Join(currentDir, "app-config.json")
		targetConfig := filepath.Join(execDir, "app-config.json")

		// Проверяем, есть ли конфигурация в текущей директории
		if _, err := os.Stat(sourceConfig); err == nil {
			// Копируем конфигурацию в директорию исполняемого файла
			data, err := ioutil.ReadFile(sourceConfig)
			if err != nil {
				return fmt.Errorf("не удалось прочитать конфигурацию: %v", err)
			}

			err = ioutil.WriteFile(targetConfig, data, 0644)
			if err != nil {
				return fmt.Errorf("не удалось скопировать конфигурацию: %v", err)
			}

			fmt.Printf("✅ Конфигурация скопирована в директорию исполняемого файла: %s\n", execDir)
		}

		// Проверяем наличие ProxiFyre.exe в директории исполняемого файла
		proxifyrePath := filepath.Join(execDir, "ProxiFyre.exe")
		if _, err := os.Stat(proxifyrePath); err == nil {
			fmt.Printf("✅ ProxiFyre.exe найден в директории исполняемого файла: %s\n", execDir)
		} else {
			fmt.Printf("⚠️ ProxiFyre.exe не найден в директории исполняемого файла: %s\n", execDir)
		}
	}

	return nil
}

// GetConfigPath возвращает полный путь к файлу конфигурации
func (a *App) GetConfigPath() string {
	execDir := a.GetExecutableDirectory()
	return filepath.Join(execDir, "app-config.json")
}

// CheckProxiFyreExists проверяет наличие ProxiFyre.exe
func (a *App) CheckProxiFyreExists() bool {
	_, err := os.Stat("ProxiFyre.exe")
	return err == nil
}

// RunProxiFyre запускает ProxiFyre.exe
func (a *App) RunProxiFyre() error {
	fmt.Printf("🔄 Вызвана функция RunProxiFyre\n")

	currentDir := a.GetCurrentDirectory()
	fmt.Printf("📁 Текущая директория: %s\n", currentDir)

	execDir := a.GetExecutableDirectory()
	fmt.Printf("📁 Директория исполняемого файла: %s\n", execDir)

	// Проверяем ProxiFyre.exe в текущей директории
	proxiFyrePathCurrent := filepath.Join(currentDir, "ProxiFyre.exe")
	fmt.Printf("🔍 Проверяю ProxiFyre.exe в текущей директории: %s\n", proxiFyrePathCurrent)

	// Проверяем ProxiFyre.exe в директории исполняемого файла
	proxiFyrePathExec := filepath.Join(execDir, "ProxiFyre.exe")
	fmt.Printf("🔍 Проверяю ProxiFyre.exe в директории исполняемого файла: %s\n", proxiFyrePathExec)

	var proxiFyrePath string

	if _, err := os.Stat(proxiFyrePathCurrent); err == nil {
		proxiFyrePath = proxiFyrePathCurrent
		fmt.Printf("✅ ProxiFyre.exe найден в текущей директории\n")
	} else if _, err := os.Stat(proxiFyrePathExec); err == nil {
		proxiFyrePath = proxiFyrePathExec
		fmt.Printf("✅ ProxiFyre.exe найден в директории исполняемого файла\n")
	} else {
		errorMsg := fmt.Sprintf("ProxiFyre.exe не найден ни в текущей директории (%s), ни в директории исполняемого файла (%s)", currentDir, execDir)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	fmt.Printf("🚀 Запускаю ProxiFyre: %s\n", proxiFyrePath)
	cmd := exec.Command(proxiFyrePath)
	cmd.Dir = filepath.Dir(proxiFyrePath)

	if runtime.GOOS == "windows" {
		cmd.SysProcAttr = &syscall.SysProcAttr{
			HideWindow: true,
		}
	}

	err := cmd.Start()
	if err != nil {
		errorMsg := fmt.Sprintf("Ошибка запуска ProxiFyre: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	fmt.Printf("✅ ProxiFyre успешно запущен (PID: %d)\n", cmd.Process.Pid)
	return nil
}

// StopProxiFyre останавливает ProxiFyre.exe
func (a *App) StopProxiFyre() error {
	fmt.Printf("🔄 Вызвана функция StopProxiFyre\n")

	if runtime.GOOS == "windows" {
		fmt.Printf("🛑 Останавливаю ProxiFyre.exe через taskkill\n")
		cmd := exec.Command("taskkill", "/F", "/IM", "ProxiFyre.exe")
		cmd.Dir = a.GetCurrentDirectory()

		err := cmd.Run()
		if err != nil {
			errorMsg := fmt.Sprintf("Ошибка остановки ProxiFyre: %v", err)
			fmt.Printf("❌ %s\n", errorMsg)
			return fmt.Errorf(errorMsg)
		}

		fmt.Printf("✅ ProxiFyre успешно остановлен\n")
		return nil
	}

	errorMsg := "Остановка поддерживается только в Windows"
	fmt.Printf("❌ %s\n", errorMsg)
	return fmt.Errorf(errorMsg)
}

// DownloadProxiFyre скачивает ProxiFyre
func (a *App) DownloadProxiFyre() error {
	fmt.Printf("🔄 Вызвана функция DownloadProxiFyre\n")

	// GitHub API для получения информации о последнем релизе
	apiURL := "https://api.github.com/repos/wiresock/proxifyre/releases/latest"
	fmt.Printf("📡 Запрос к GitHub API: %s\n", apiURL)

	// Создаем HTTP клиент с User-Agent
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		errorMsg := fmt.Sprintf("Ошибка создания HTTP запроса: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Устанавливаем заголовки как в Python версии
	req.Header.Set("User-Agent", "Mozilla/5.0")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	// Выполняем запрос
	resp, err := client.Do(req)
	if err != nil {
		errorMsg := fmt.Sprintf("Ошибка HTTP запроса: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errorMsg := fmt.Sprintf("GitHub API вернул статус: %d", resp.StatusCode)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Читаем ответ
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		errorMsg := fmt.Sprintf("Ошибка чтения ответа: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Парсим JSON ответ
	var releaseData map[string]interface{}
	if err := json.Unmarshal(body, &releaseData); err != nil {
		errorMsg := fmt.Sprintf("Ошибка парсинга JSON: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Получаем информацию о релизе
	tagName, _ := releaseData["tag_name"].(string)
	fmt.Printf("📦 Найден релиз: %s\n", tagName)

	// Ищем ссылку на архив (как в Python версии)
	var zipURL string
	if assets, ok := releaseData["assets"].([]interface{}); ok {
		for _, asset := range assets {
			if assetMap, ok := asset.(map[string]interface{}); ok {
				assetName, _ := assetMap["name"].(string)
				if strings.Contains(strings.ToLower(assetName), "x64-signed.zip") ||
					strings.Contains(strings.ToLower(assetName), "x86-signed.zip") {
					zipURL, _ = assetMap["browser_download_url"].(string)
					break
				}
			}
		}
	}

	if zipURL == "" {
		errorMsg := "Не удалось найти архив в релизе"
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	fmt.Printf("🔗 Скачиваю: %s\n", zipURL)

	// Создаем временную папку для загрузки
	tempDir, err := os.MkdirTemp("", "proxifyre-download")
	if err != nil {
		errorMsg := fmt.Sprintf("Ошибка создания временной папки: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer os.RemoveAll(tempDir) // Удаляем временную папку при выходе

	zipPath := filepath.Join(tempDir, "proxifyre.zip")
	fmt.Printf("📁 Временная папка: %s\n", tempDir)

	// Скачиваем архив
	fmt.Printf("📥 Скачиваю архив...\n")
	zipResp, err := http.Get(zipURL)
	if err != nil {
		errorMsg := fmt.Sprintf("Ошибка скачивания архива: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer zipResp.Body.Close()

	zipFile, err := os.Create(zipPath)
	if err != nil {
		errorMsg := fmt.Sprintf("Ошибка создания файла архива: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer zipFile.Close()

	_, err = io.Copy(zipFile, zipResp.Body)
	if err != nil {
		errorMsg := fmt.Sprintf("Ошибка сохранения архива: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	fmt.Printf("📦 Архив скачан, распаковываю...\n")

	// Разархивируем
	execDir := a.GetExecutableDirectory()
	fmt.Printf("📁 Распаковываю в: %s\n", execDir)

	archive, err := zip.OpenReader(zipPath)
	if err != nil {
		errorMsg := fmt.Sprintf("Ошибка открытия архива: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer archive.Close()

	// Считаем извлеченные файлы
	extractedFiles := 0
	for _, file := range archive.File {
		if file.FileInfo().IsDir() {
			continue
		}

		// Проверяем расширение файла (как в Python версии)
		fileName := file.Name
		if strings.HasSuffix(strings.ToLower(fileName), ".exe") ||
			strings.HasSuffix(strings.ToLower(fileName), ".dll") ||
			strings.HasSuffix(strings.ToLower(fileName), ".txt") ||
			strings.HasSuffix(strings.ToLower(fileName), ".md") {

			// Создаем путь для извлечения
			extractPath := filepath.Join(execDir, fileName)

			// Создаем директории если нужно
			if err := os.MkdirAll(filepath.Dir(extractPath), 0755); err != nil {
				fmt.Printf("⚠️ Не удалось создать директорию для %s: %v\n", fileName, err)
				continue
			}

			// Создаем файл
			dstFile, err := os.Create(extractPath)
			if err != nil {
				fmt.Printf("⚠️ Не удалось создать файл %s: %v\n", fileName, err)
				continue
			}

			// Открываем файл из архива
			srcFile, err := file.Open()
			if err != nil {
				dstFile.Close()
				fmt.Printf("⚠️ Не удалось открыть файл из архива %s: %v\n", fileName, err)
				continue
			}

			// Копируем содержимое
			_, err = io.Copy(dstFile, srcFile)
			srcFile.Close()
			dstFile.Close()

			if err != nil {
				fmt.Printf("⚠️ Не удалось скопировать файл %s: %v\n", fileName, err)
				continue
			}

			extractedFiles++
			fmt.Printf("✅ Извлечен файл: %s\n", fileName)
		}
	}

	if extractedFiles > 0 {
		successMsg := fmt.Sprintf("Архив успешно распакован! Извлечено файлов: %d", extractedFiles)
		fmt.Printf("✅ %s\n", successMsg)
		return nil
	} else {
		errorMsg := "Не удалось распаковать архив"
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
}

// InstallService устанавливает ProxiFyre как сервис
func (a *App) InstallService() error {
	if !a.CheckProxiFyreExists() {
		return fmt.Errorf("ProxiFyre.exe не найден в текущей директории")
	}

	cmd := exec.Command("ProxiFyre.exe", "install")
	cmd.Dir = a.GetCurrentDirectory()
	return cmd.Run()
}

// UninstallService удаляет сервис ProxiFyre
func (a *App) UninstallService() error {
	if !a.CheckProxiFyreExists() {
		return fmt.Errorf("ProxiFyre.exe не найден в текущей директории")
	}

	cmd := exec.Command("ProxiFyre.exe", "uninstall")
	cmd.Dir = a.GetCurrentDirectory()
	return cmd.Run()
}

// StartService запускает сервис ProxiFyre
func (a *App) StartService() error {
	if !a.CheckProxiFyreExists() {
		return fmt.Errorf("ProxiFyre.exe не найден в текущей директории")
	}

	cmd := exec.Command("ProxiFyre.exe", "start")
	cmd.Dir = a.GetCurrentDirectory()
	return cmd.Run()
}

// StopService останавливает сервис ProxiFyre
func (a *App) StopService() error {
	if !a.CheckProxiFyreExists() {
		return fmt.Errorf("ProxiFyre.exe не найден в текущей директории")
	}

	cmd := exec.Command("ProxiFyre.exe", "stop")
	cmd.Dir = a.GetCurrentDirectory()
	return cmd.Run()
}

// GetServiceStatus возвращает статус сервиса
func (a *App) GetServiceStatus() string {
	if runtime.GOOS != "windows" {
		return "Не поддерживается в данной ОС"
	}

	cmd := exec.Command("sc", "query", "ProxiFyre")
	output, err := cmd.Output()
	if err != nil {
		return "Сервис не найден"
	}

	outputStr := string(output)
	if strings.Contains(outputStr, "RUNNING") {
		return "Запущен"
	} else if strings.Contains(outputStr, "STOPPED") {
		return "Остановлен"
	}

	return "Неизвестно"
}

// GetTimestamp возвращает текущее время в формате HH:MM:SS
func (a *App) GetTimestamp() string {
	return time.Now().Format("15:04:05")
}
