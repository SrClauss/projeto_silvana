from fastapi import APIRouter, Depends, HTTPException
from ..models.produtos import Produto
from ..database.produtos_db import (
    create_produto, get_produtos, get_produto_by_id,
    update_produto, delete_produto
)
from ..routers.auth import get_current_user

router = APIRouter()

@router.post("/", dependencies=[Depends(get_current_user)])
async def create_produto_endpoint(produto: Produto):
    produto_id = await create_produto(produto)
    return {"id": produto_id}

@router.get("/", dependencies=[Depends(get_current_user)])
async def get_produtos_endpoint():
    return await get_produtos()

@router.get("/{produto_id}", dependencies=[Depends(get_current_user)])
async def get_produto(produto_id: str):
    produto = await get_produto_by_id(produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto not found")
    return produto

@router.put("/{produto_id}", dependencies=[Depends(get_current_user)])
async def update_produto_endpoint(produto_id: str, update_data: dict):
    produto = await update_produto(produto_id, update_data)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto not found")
    return produto

@router.delete("/{produto_id}", dependencies=[Depends(get_current_user)])
async def delete_produto_endpoint(produto_id: str):
    result = await delete_produto(produto_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto not found")
    return {"message": "Produto deleted"}