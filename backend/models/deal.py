from enum import Enum
from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional

from backend.models.base import PyObjectId


class DealType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class ProductType(str, Enum):
    GAS = "GAS"
    ELECTRICITY = "ELECTRICITY"
    SOLAR = "SOLAR"
    WIND = "WIND"
    OIL = "OIL"
    CO2 = "CO2"


class DealCreate(BaseModel):
    type: DealType
    product: ProductType
    delivery_date: date
    amount: float
    volume: float


class DealInDB(DealCreate):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DealPublic(DealCreate):
    id: str
    created_at: Optional[datetime] = None