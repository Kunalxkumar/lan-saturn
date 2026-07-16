import sqlite3
import os
from app.config import Config

class DatabaseManager:
    def __init__(self, db_path=None):
        self.db_path = db_path or Config.DATABASE_PATH
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        # Create tables if they do not exist
        schema = """
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            username TEXT,
            message TEXT,
            channel TEXT,
            timestamp TEXT,
            encrypted INTEGER,
            encryption_version TEXT,
            salt TEXT,
            nonce TEXT,
            type TEXT,
            dm_user TEXT,
            file_url TEXT,
            original_type TEXT,
            original_size INTEGER
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            channel TEXT,
            text TEXT,
            done INTEGER,
            creator TEXT
        );

        CREATE TABLE IF NOT EXISTS polls (
            id TEXT PRIMARY KEY,
            question TEXT,
            options TEXT, -- JSON string serialized options array
            creator TEXT,
            closed INTEGER,
            channel TEXT,
            timestamp TEXT
        );

        CREATE TABLE IF NOT EXISTS poll_votes (
            poll_id TEXT,
            option_index INTEGER,
            username TEXT,
            PRIMARY KEY (poll_id, username)
        );

        CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            text TEXT,
            username TEXT,
            timestamp TEXT
        );

        CREATE TABLE IF NOT EXISTS transfer_history (
            id TEXT PRIMARY KEY,
            filename TEXT,
            size INTEGER,
            hash TEXT,
            timestamp REAL,
            type TEXT,
            direction TEXT
        );

        CREATE TABLE IF NOT EXISTS channel_passwords (
            channel_id TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS invite_codes (
            code TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            expires_at REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS trusted_devices (
            ip_addr TEXT,
            user_agent TEXT,
            trusted INTEGER DEFAULT 0,
            PRIMARY KEY (ip_addr, user_agent)
        );

        CREATE TABLE IF NOT EXISTS calendar_events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT,
            creator TEXT NOT NULL,
            channel TEXT NOT NULL
        );
        """
        with self.get_connection() as conn:
            conn.executescript(schema)
            conn.commit()

# Single database instance pool
db_manager = DatabaseManager()
