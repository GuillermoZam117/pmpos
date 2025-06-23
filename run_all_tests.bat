@echo off
echo 🧪 EJECUTANDO TODOS LOS TESTS DE PMPOS
echo ==========================================

echo.
echo 1️⃣ TESTS UNITARIOS REALES...
node tests/unit_tests_real.js

echo.
echo 2️⃣ TESTS DE INTEGRACION WEB...
node tests/web_integration_tests.js

echo.
echo 3️⃣ TESTS DIAGNOSTICOS...
node tests/diagnostic_tests.js

echo.
echo 4️⃣ TESTS DEL SISTEMA POS...
node tests/pos_system_test.js

echo.
echo 5️⃣ TESTS DE INTEGRACION DEL PROYECTO...
node tests/integration_test.js

echo.
echo ✅ TODOS LOS TESTS COMPLETADOS
pause 