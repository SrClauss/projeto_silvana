from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from pymongo import ObjectId

class Item(BaseModel):
    id = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    quantity: int
    acquisition_date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True