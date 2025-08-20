@echo off
echo Building ProxiFyre Configuration Editor...

REM Установка зависимостей
echo Installing Go dependencies...
go mod tidy

REM Установка frontend зависимостей
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Сборка frontend
echo Building frontend...
cd frontend
call npm run build
cd ..

REM Сборка приложения
echo Building application...
wails build -platform windows/amd64

echo Build completed!
echo Executable: ProxiFyreConfigEditor.exe
pause
