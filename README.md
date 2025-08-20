# ProxiFyre Configuration Editor

Desktop-приложение для редактирования конфигурации ProxiFyre, построенное с использованием Wails v2 (Go + Web Frontend).
Для работы требуется **Windows Packet Filter** [скачать](https://github.com/wiresock/ndisapi/releases/latest).

## Требования

- **Go 1.23+** - [скачать](https://golang.org/dl/)
- **Node.js 16+** - [скачать](https://nodejs.org/)
- **Wails CLI v2** - установить командой: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- **Git** - для клонирования репозитория


## Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd ProxiFyre-gui-go
```

2. Установите зависимости Go:
```bash
go mod tidy
```

3. Установите зависимости frontend:
```bash
cd frontend
npm install
cd ..
```

## Сборка

### Автоматическая сборка (Windows)
Запустите скрипт сборки:
```bash
build.bat
```

### Ручная сборка
1. Соберите frontend:
```bash
cd frontend
npm run build
cd ..
```

2. Соберите приложение:
```bash
wails build -platform windows/amd64
```

Результат сборки: `ProxiFyreConfigEditor.exe`

## Разработка

### Запуск в режиме разработки
```bash
wails dev
```

### Только frontend разработка
```bash
cd frontend
npm run dev
```

## Структура проекта

- `main.go` - точка входа Go приложения
- `app.go` - основная логика приложения
- `frontend/` - веб-интерфейс (Vite + Vanilla JS)
- `wails.json` - конфигурация Wails

## Платформы

- **Windows** (amd64) - основная поддержка
- Другие платформы: измените параметр `-platform` в команде сборки

## TODO

Добавить поддержку одновременно нескольких прокси

## Лицензия

Проект разработан Taz (taz@turn-guild.ru) с помощю ИИ
