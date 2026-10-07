from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class AnimeAskRequest(BaseModel):
    mode: Literal["evaluate", "recommend"]
    prompt: str = Field(min_length=2, max_length=1200)


class AnimeRecommendation(BaseModel):
    title: str
    score: Optional[int] = Field(default=None, ge=1, le=10)
    reason: str


class AnimeAskResponse(BaseModel):
    answer: str
    score: Optional[int] = Field(default=None, ge=1, le=10)
    recommendations: List[AnimeRecommendation] = Field(default_factory=list)