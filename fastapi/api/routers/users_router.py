from fastapi import APIRouter, Depends, HTTPException
from ..models.users import UserCreate, UserUpdate
from ..database.users_db import (
    create_user, get_users, get_user_by_id,
    update_user, delete_user
)
from ..routers.auth import get_current_user

router = APIRouter()

@router.post("/", dependencies=[Depends(get_current_user)])
async def create_user_endpoint(user: UserCreate):
    user_id = await create_user(user)
    return {"id": user_id}

@router.get("/", dependencies=[Depends(get_current_user)])
async def get_users_endpoint():
    return await get_users()

@router.get("/{user_id}", dependencies=[Depends(get_current_user)])
async def get_user(user_id: str):
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", dependencies=[Depends(get_current_user)])
async def update_user_endpoint(user_id: str, update_data: UserUpdate):
    user = await update_user(user_id, update_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/{user_id}", dependencies=[Depends(get_current_user)])
async def delete_user_endpoint(user_id: str):
    result = await delete_user(user_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


@router.get("/cpf/{cpf}", dependencies=[Depends(get_current_user)])
async def get_user_by_cpf(cpf: str):
    user = await find_by_cpf(cpf)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user 