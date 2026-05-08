from enum import Enum
from datetime import date, datetime, UTC
from typing import Optional

from pydantic import BaseModel, Field
from backend.models.base import PyObjectId


class DealType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class ProductType(str, Enum):
    GAS = "GAS"
    ELECTRICITY = "ELECTRICITY"
    OIL = "OIL"
    CO2 = "CO2"


class DealBase(BaseModel):

    # Champs stables
    deal_type: DealType
    product: ProductType

    # Champs métier dynamiques
    deal_id: str
    portfolio: str
    desk: Optional[str] = None
    direction: Optional[str] = None
    entity: Optional[str] = None
    trader_code: Optional[str] = None
    counterparty_name: Optional[str] = None
    business_unit: Optional[str] = None

    # Dates
    trade_date: Optional[date] = None
    delivery_date: date
    creation_date: Optional[datetime] = None

    # Quantité / finance
    volume: float
    quantity_unit: str = "MWh"
    amount: float
    price: Optional[float] = None
    open_quantity: Optional[float] = None
    cash: Optional[float] = None
    margin_cost: Optional[float] = None
    total_margin_cost: Optional[float] = None

    # Livraison
    delivery_point: Optional[str] = None
    delivery_type: Optional[str] = None
    transport_corridor: Optional[str] = None

    # Statut
    booking_status: str = "BOOKED"


class DealCreate(DealBase):
    pass


class DealInDB(DealBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            PyObjectId: str
        }
    }


class DealPublic(DealBase):
    id: str
    created_at: Optional[datetime] = None