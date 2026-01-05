from fastapi import APIRouter, Depends, HTTPException
from ..models.condicional_cliente import CondicionalCliente
from ..database.condicional_cliente_db import (
    create_condicional_cliente, get_condicional_clientes, get_condicional_cliente_by_id,
    update_condicional_cliente, delete_condicional_cliente
)
from ..routers.auth import get_current_user

router = APIRouter()

@router.post("/", dependencies=[Depends(get_current_user)])
async def create_condicional_cliente_endpoint(condicional: CondicionalCliente):
    condicional_id = await create_condicional_cliente(condicional)
    return {"id": condicional_id}

@router.get("/", dependencies=[Depends(get_current_user)])
async def get_condicional_clientes_endpoint():
    return await get_condicional_clientes()

@router.get("/{condicional_id}", dependencies=[Depends(get_current_user)])
async def get_condicional_cliente(condicional_id: str):
    condicional = await get_condicional_cliente_by_id(condicional_id)
    if not condicional:
        raise HTTPException(status_code=404, detail="Condicional Cliente not found")
    return condicional

@router.put("/{condicional_id}", dependencies=[Depends(get_current_user)])
async def update_condicional_cliente_endpoint(condicional_id: str, update_data: dict):
    condicional = await update_condicional_cliente(condicional_id, update_data)
    if not condicional:
        raise HTTPException(status_code=404, detail="Condicional Cliente not found")
    return condicional

@router.delete("/{condicional_id}", dependencies=[Depends(get_current_user)])
async def delete_condicional_cliente_endpoint(condicional_id: str):
    result = await delete_condicional_cliente(condicional_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Condicional Cliente not found")
    return {"message": "Condicional Cliente deleted"}