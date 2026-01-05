from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId


class Item(BaseModel):
    quantity: int
    acquisition_date: datetime
    class Config:
        populate_by_name = True