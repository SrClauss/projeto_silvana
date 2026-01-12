# Projeto Silvana - Docker Deployment Guide

## Arquivos Docker

Este projeto possui duas configurações Docker:

### 1. Produção (`docker-compose.yml`)
Build completo do frontend e backend para implantação em produção.

**Como usar:**
```bash
# Build e iniciar (sempre faz rebuild do frontend e backend)
docker-compose up --build

# Parar e remover containers
docker-compose down

# Rebuild forçado (remove cache)
docker-compose build --no-cache
docker-compose up
```

**Características:**
- Frontend buildado como aplicação estática servida pelo nginx (porta 80)
- Backend otimizado para produção (porta 8000)
- MongoDB (porta 27017)
- Sempre faz rebuild quando usar `--build`

### 2. Desenvolvimento (`docker-compose.dev.yml`)
Ambiente de desenvolvimento com hot-reload.

**Como usar:**
```bash
# Iniciar em modo desenvolvimento
docker-compose -f docker-compose.dev.yml up

# Parar
docker-compose -f docker-compose.dev.yml down
```

**Características:**
- Frontend com hot-reload (Vite dev server na porta 5173)
- Backend com hot-reload (uvicorn --reload na porta 8000)
- Volumes montados para edição em tempo real
- MongoDB (porta 27017)

## Solução do Problema de Cache

O problema anterior era que o frontend não atualizava porque:
1. Usava volumes montados em produção ao invés de build
2. Nginx tentava servir de `./react/build` (diretório inexistente)
3. Não havia Dockerfiles próprios com processo de build

**Solução implementada:**
- ✅ Dockerfiles dedicados para frontend e backend
- ✅ Multi-stage build no frontend (build + nginx)
- ✅ Frontend builda para `/dist` e serve via nginx
- ✅ `docker-compose up --build` sempre faz rebuild
- ✅ Separação entre ambiente dev e produção

## URLs de Acesso

### Produção
- Frontend: http://localhost
- Backend API: http://localhost:8000
- MongoDB: localhost:27017

### Desenvolvimento
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- MongoDB: localhost:27017

## Comandos Úteis

```bash
# Ver logs
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f frontend
docker-compose logs -f backend

# Remover tudo (containers, volumes, networks)
docker-compose down -v

# Rebuild completo sem cache
docker-compose build --no-cache --pull
docker-compose up
```

## Notas Importantes

1. **Sempre use `--build`** em produção para garantir que as mudanças sejam aplicadas:
   ```bash
   docker-compose up --build
   ```

2. **Para forçar rebuild completo** (remove cache Docker):
   ```bash
   docker-compose build --no-cache
   ```

3. **Desenvolvimento vs Produção**:
   - Use `docker-compose.dev.yml` para desenvolvimento (hot-reload)
   - Use `docker-compose.yml` para produção (otimizado)
