from fastapi import APIRouter, Depends, HTTPException
from ..models.sessoes import Sessao
from ..database.sessoes_db import (
    create_sessao, get_sessoes, get_sessao_by_id,
    update_sessao, delete_sessao
)
from ..routers.auth import get_current_user

router = APIRouter()

@router.post("/", dependencies=[Depends(get_current_user)])
async def create_sessao_endpoint(sessao: Sessao):
    sessao_id = await create_sessao(sessao)
    return {"id": sessao_id}

@router.get("/", dependencies=[Depends(get_current_user)])
async def get_sessoes_endpoint():
    return await get_sessoes()

@router.get("/{sessao_id}", dependencies=[Depends(get_current_user)])
async def get_sessao(sessao_id: str):
    sessao = await get_sessao_by_id(sessao_id)
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão not found")
    return sessao

@router.put("/{sessao_id}", dependencies=[Depends(get_current_user)])
async def update_sessao_endpoint(sessao_id: str, update_data: dict):
    sessao = await update_sessao(sessao_id, update_data)
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão not found")
    return sessao

@router.delete("/{sessao_id}", dependencies=[Depends(get_current_user)])
async def delete_sessao_endpoint(sessao_id: str):
    result = await delete_sessao(sessao_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sessão not found")
    return {"message": "Sessão deleted"}
