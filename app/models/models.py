from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any

@dataclass
class Message:
    id: str
    username: str
    message: str
    channel: str
    timestamp: str
    encrypted: bool = False
    encryption_version: str = ""
    salt: str = ""
    nonce: str = ""
    type: str = "text"
    dm_user: Optional[str] = None
    file_url: Optional[str] = None
    original_type: Optional[str] = None
    original_size: Optional[int] = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class Task:
    id: str
    channel: str
    text: str
    done: bool
    creator: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_row(cls, row: Any) -> 'Task':
        return cls(
            id=row['id'],
            channel=row['channel'],
            text=row['text'],
            done=bool(row['done']),
            creator=row['creator']
        )

@dataclass
class Poll:
    id: str
    question: str
    options: List[str]
    creator: str
    closed: bool
    channel: str
    timestamp: str
    votes: Dict[int, List[str]] = field(default_factory=dict) # option_index -> [username]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class Announcement:
    id: str
    text: str
    username: str
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_row(cls, row: Any) -> 'Announcement':
        return cls(
            id=row['id'],
            text=row['text'],
            username=row['username'],
            timestamp=row['timestamp']
        )

@dataclass
class TransferItem:
    id: str
    filename: str
    size: int
    hash: str
    timestamp: float
    type: str  # 'upload', 'download'
    direction: str  # 'sent', 'received'

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
