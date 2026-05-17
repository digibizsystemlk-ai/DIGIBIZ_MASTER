@echo off
echo ===================================================
echo   DigiBiz Global Sync (Live -^> Testing)
echo ===================================================
echo.

echo [1/3] Setting up God Mode rules for Testing...
copy /y firestore.rules firestore.rules.bak >nul
echo rules_version = '2'; > firestore.rules
echo service cloud.firestore { >> firestore.rules
echo   match /databases/{database}/documents { >> firestore.rules
echo     match /{document=**} { >> firestore.rules
echo       allow read, write: if true; >> firestore.rules
echo     } >> firestore.rules
echo   } >> firestore.rules
echo } >> firestore.rules

call firebase deploy -P staging --only firestore:rules

echo.
echo [2/3] Starting Controlled Data Sync...
node scratch/sync_live_to_test.js

echo.
echo [3/3] Restoring original security rules...
move /y firestore.rules.bak firestore.rules >nul
call firebase deploy -P staging --only firestore:rules

echo.
echo ===================================================
echo   Sync Complete! You can now check the Dashboard.
echo ===================================================
pause
