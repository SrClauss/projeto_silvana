from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from pymongo import ObjectId

class Item(BaseModel):
    id = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    description: Optional[str] = None
    price: float
    quantity: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True