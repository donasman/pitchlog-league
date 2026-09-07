@echo off
REM Windows 작업 스케줄러용 래퍼.
REM 스케줄러는 작업 디렉터리를 보장하지 않으므로 여기서 backend/ 로 옮긴 뒤 실행한다.
cd /d "%~dp0.."
call npm run backup
exit /b %ERRORLEVEL%
