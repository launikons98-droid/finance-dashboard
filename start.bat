@echo off
cd /d "%~dp0"
echo ================================
echo  Запуск локального сервера...
echo  Браузер откроется автоматически
echo  Для остановки закрой это окно
echo ================================
start http://localhost:8000/index.html
python -m http.server 8000
pause