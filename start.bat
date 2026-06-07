@echo off
REM World Cup 2026 Hub - start a local server and open the Hub. Windows.
cd /d "%~dp0"
set PORT=8080
set URL=http://localhost:%PORT%/worldcup/
where py >nul 2>nul && ( start "" "%URL%" & py -m http.server %PORT% & goto :eof )
where python >nul 2>nul && ( start "" "%URL%" & python -m http.server %PORT% & goto :eof )
where node >nul 2>nul && ( start "" "%URL%" & node serve.js & goto :eof )
echo Could not find Python or Node. Install either (python.org or nodejs.org),
echo or use the online version: https://craigm26.github.io/WorldCup2026BracketForFamilies/
pause
