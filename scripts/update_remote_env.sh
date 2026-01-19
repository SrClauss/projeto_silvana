#!/usr/bin/env bash
set -euo pipefail

# Script para ajustar ACCESS_TOKEN_EXPIRE_MINUTES no servidor
# Uso local: scp scripts/update_remote_env.sh root@72.60.146.2:/tmp && ssh root@72.60.146.2 'bash /tmp/update_remote_env.sh'

ENV_PATH=/srv/projeto_silvana/fastapi/.env
BACKUP="${ENV_PATH}.bak.$(date +%s)"

if [ ! -f "$ENV_PATH" ]; then
  echo "Arquivo $ENV_PATH não encontrado. Saindo."
  exit 1
fi

echo "Criando backup: $BACKUP"
cp "$ENV_PATH" "$BACKUP"

# Substitui ou adiciona a variável com 240 minutos (4 horas)
if grep -q '^ACCESS_TOKEN_EXPIRE_MINUTES=' "$ENV_PATH"; then
  sed -i 's/^ACCESS_TOKEN_EXPIRE_MINUTES=.*/ACCESS_TOKEN_EXPIRE_MINUTES=240/' "$ENV_PATH"
else
  echo "ACCESS_TOKEN_EXPIRE_MINUTES=240" >> "$ENV_PATH"
fi

echo "Nova configuração:"
grep '^ACCESS_TOKEN_EXPIRE_MINUTES' "$ENV_PATH" || true

# Tenta reiniciar o backend. Os comandos tentados (na ordem): docker compose restart, docker-compose restart, docker compose up -d --build backend, systemctl, uvicorn
cd /srv/projeto_silvana || true

if [ -f docker-compose.yml ]; then
  echo "Reiniciando serviço com Docker Compose..."
  if command -v docker >/dev/null 2>&1; then
    docker compose restart backend || docker-compose restart backend || docker compose up -d --build backend
  else
    echo "Docker não encontrado. Pule o restart." >&2
  fi
elif systemctl list-units --type=service --all | grep -q "backend"; then
  echo "Tentando reiniciar serviço systemd 'backend'..."
  systemctl restart backend || echo "Falha ao reiniciar systemd. Verifique o nome do serviço." >&2
else
  echo "Tentando reiniciar qualquer processo uvicorn..."
  pkill -f uvicorn || true
  cd /srv/projeto_silvana/fastapi || true
  nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload >/dev/null 2>&1 &
fi

# Mensagens finais
echo "Pronto. Verifique os logs se necessário (ex.: docker compose logs -f backend ou journalctl -u <service>)."

echo "Dica: após alterar, gere um token teste via POST /auth/login e verifique o 'exp' no jwt.io para confirmar 4 horas."