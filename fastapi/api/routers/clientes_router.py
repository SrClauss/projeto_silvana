from fastapi import APIRouter, Depends, HTTPException
from ..models.clientes import Cliente
from ..database.clientes_db import (
    create_cliente, get_clientes, get_cliente_by_id,
    update_cliente, delete_cliente
)
from ..routers.auth import get_current_user

router = APIRouter()

@router.post("/", dependencies=[Depends(get_current_user)])
async def create_cliente_endpoint(cliente: Cliente):
    cliente_id = await create_cliente(cliente)
    return {"id": cliente_id}

@router.get("/", dependencies=[Depends(get_current_user)])
async def get_clientes_endpoint(q: str | None = None, cpf: str | None = None):
    """Optional query params `q` filters clientes by name, `cpf` filters by cpf (both case-insensitive)."""
    return await get_clientes(q, cpf)

@router.get("/{cliente_id}", dependencies=[Depends(get_current_user)])
async def get_cliente(cliente_id: str):
    cliente = await get_cliente_by_id(cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    return cliente

@router.put("/{cliente_id}", dependencies=[Depends(get_current_user)])
async def update_cliente_endpoint(cliente_id: str, update_data: dict):
    cliente = await update_cliente(cliente_id, update_data)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    return cliente

@router.delete("/{cliente_id}", dependencies=[Depends(get_current_user)])
async def delete_cliente_endpoint(cliente_id: str):
    result = await delete_cliente(cliente_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente not found")
    return {"message": "Cliente deleted"}