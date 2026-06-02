#!/usr/bin/env bash
#
# Backup del historial git completo del proyecto.
#
# Por qué no lo hizo Claude desde Cowork: el .git tiene 805MB de objetos
# sueltos y el cruce de filesystems del sandbox de Cowork es lento
# (~3 MB/s). Ejecutar esto desde tu propia terminal es instantáneo
# (disco local a disco local).
#
# Uso:
#   chmod +x _backup-git-history.sh
#   ./_backup-git-history.sh
#
# Output:
#   ~/Desktop/baloskycom-git-history-YYYY-MM-DD.bundle
#
# Después de correrlo, mové el .bundle al disco externo.
# Para restaurar el repo desde el bundle (si algún día lo necesitás):
#   git clone baloskycom-git-history-YYYY-MM-DD.bundle baloskycom-restored
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -d ".git" ]; then
  echo "❌ No estás en la raíz del repo (no hay .git)"
  exit 1
fi

TS="$(date +%Y-%m-%d)"
DEST="$HOME/Desktop/baloskycom-git-history-${TS}.bundle"

echo "→ Compactando objetos sueltos (acelera el bundle)..."
git gc --aggressive --prune=now 2>&1 | tail -3

echo ""
echo "→ Generando bundle con todo el historial..."
git bundle create "$DEST" --all

echo ""
echo "✓ Listo:"
ls -lh "$DEST"

echo ""
echo "Movelo a tu disco externo. Para restaurar más adelante:"
echo "   git clone \"$DEST\" baloskycom-restored"
