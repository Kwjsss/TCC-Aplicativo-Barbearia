#!/bin/bash
# Script para reverter o design para o original

echo "Revertendo design para o original..."
cp /app/frontend/src/App.css.backup /app/frontend/src/App.css
echo "Design revertido com sucesso!"
echo "Reinicie o frontend para ver as mudanças: sudo supervisorctl restart frontend"