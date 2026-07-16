from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

class SendMessageSchema(BaseModel):
    username: str = Field(default="Anonymous", max_length=50)
    message: str = Field(..., min_length=1)
    channel: str = Field(default="general", max_length=50)
    timestamp: str = Field(default="")
    encrypted: bool = Field(default=False)
    encryptionVersion: Optional[str] = Field(default="")
    salt: Optional[str] = Field(default="")
    nonce: Optional[str] = Field(default="")
    type: Optional[str] = Field(default="text")
    dmUser: Optional[str] = Field(default=None)
    fileUrl: Optional[str] = Field(default=None)
    originalType: Optional[str] = Field(default=None)
    originalSize: Optional[int] = Field(default=0)

class CreatePollSchema(BaseModel):
    question: str = Field(..., min_length=1, max_length=200)
    options: List[str] = Field(..., min_items=2, max_items=6)
    channel: str = Field(default="general", max_length=50)
    username: str = Field(default="Anonymous", max_length=50)
    timestamp: str = Field(default="")

    @field_validator('options')
    @classmethod
    def validate_options(cls, v):
        cleaned = [opt.strip() for opt in v if opt.strip()]
        if len(cleaned) < 2:
            raise ValueError('At least two non-empty options required')
        return cleaned

class VotePollSchema(BaseModel):
    pollId: str
    optionIndex: int
    username: str = Field(default="Anonymous", max_length=50)

class CreateTaskSchema(BaseModel):
    channel: str = Field(default="general", max_length=50)
    text: str = Field(..., min_length=1, max_length=300)
    username: str = Field(default="Anonymous", max_length=50)

class ToggleTaskSchema(BaseModel):
    channel: str = Field(default="general", max_length=50)
    taskId: str

class DeleteTaskSchema(BaseModel):
    channel: str = Field(default="general", max_length=50)
    taskId: str

class BroadcastAnnouncementSchema(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    username: str = Field(default="Anonymous", max_length=50)
    timestamp: str = Field(default="")

class SetSharedDirectorySchema(BaseModel):
    path: str
