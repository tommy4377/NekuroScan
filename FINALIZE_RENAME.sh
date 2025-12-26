#!/bin/bash
# Script per finalizzare il rename in Git

set -e

cd /home/tommy/Documenti/GitHub/NekuroScan

echo "🔄 Finalizzando rename in Git..."

# Aggiungi tutti i file della nuova cartella
echo "📁 Aggiungendo file da nekuroscan/..."
git add nekuroscan/

# Rimuovi i riferimenti alla vecchia cartella (se esiste ancora)
if [ -d "kuro-reader" ]; then
    echo "🗑️  Rimuovendo riferimenti a kuro-reader/..."
    git rm -r kuro-reader/
fi

# Rimuovi file temporanei
echo "🧹 Rimuovendo file temporanei..."
rm -f RENAME_COMMANDS.sh RENAME_STEPS.md 2>/dev/null || true

# Mostra stato
echo ""
echo "📊 Stato attuale:"
git status --short | head -20

echo ""
echo "✅ Per completare, esegui:"
echo "   git commit -m 'refactor: rename project from KuroReader to NeKuroScan'"
echo ""
echo "⚠️  RICORDA: Rinomina prima la repository su GitHub!"

