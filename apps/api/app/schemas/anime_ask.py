from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class AnimeAskRequest(BaseModel):
    mode: Literal["evaluate", "recommend"]
    prompt: str = Field(min_length=1, max_length=1200)
    anime_title: Optional[str] = Field(default=None, max_length=255)
    favorite_topics: List[str] = Field(default_factory=list)


class AnimeRecommendation(BaseModel):
    title: str
    score: Optional[float] = Field(default=None, ge=1, le=10)
    reason: str


class AnimeEvaluation(BaseModel):
    title: Optional[str] = None
    synopsis: Optional[str] = None  # Worum geht es (spoilerfrei)
    story_quality: Optional[str] = None  # Story, Plot & Pacing Qualität (Community-Konsens)
    animation_quality: Optional[str] = None  # Studio, Animation & visuelle Qualität
    ecchi_level: Optional[str] = None  # z. B. "Kein Fanservice", "Wenig", "Moderat", "Sehr hoch"
    violence_level: Optional[str] = None  # z. B. "Mild / Keine", "Typische Action", "Düster & Blutig", "Extrem / Gore"
    content_notes: Optional[str] = None  # Kurze Notiz zu Ecchi, Gewalt oder Alterseignung
    match_reason: Optional[str] = None  # Bezug zu bisherigen Bewertungen & Lieblings-Themen
    verdict: Optional[str] = None  # Zusammenfassendes Fazit


class AnimeAskResponse(BaseModel):
    answer: str
    score: Optional[float] = Field(default=None, ge=1, le=10)
    recommendations: List[AnimeRecommendation] = Field(default_factory=list)
    evaluation: Optional[AnimeEvaluation] = None