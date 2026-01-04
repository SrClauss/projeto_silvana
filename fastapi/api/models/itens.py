from pydantic import BaseModel
from datetime import datetime

class Item(BaseModel):
    quantity: int
    acquisition_date: datetime