use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::time::SystemTime;

const VERSION_NUMBER: u32 = 1;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Safe {
    pub id: Uuid,
    pub encrypted_blob: Vec<u8>,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
    pub metadata: SafeMatadata,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SafeMatadata {
    pub size: usize,
    pub version: u32,
}

#[derive(Debug, Deserialize)]
pub struct CreateSafeRequest {
    pub encrypted_blob: Vec<u8>,
    pub metadata: SafeMatadata,
}

#[derive(Debug, Deserialize)]
pub struct EditSafeRequest {
    pub id: Uuid,
    pub encrypted_blob: Option<Vec<u8>>,
    pub metadata: Option<SafeMatadata>,
}

// #[derive(Debug, Deserialize)]
// pub struct GetSafeRequest {
//     pub id: Uuid,
// }

#[derive(Debug, Serialize)]
pub struct CreateSafeResponse {
    pub id: Uuid,
    pub created_at: SystemTime,
    pub metadata: SafeMatadata,
}

#[derive(Debug, Serialize)]
pub struct EditSafeResponse {
    pub id: Uuid,
    pub updated_at: SystemTime,
    pub metadata: SafeMatadata,
}

#[derive(Debug, Serialize)]
pub struct GetSafeResponse {
    pub id: Uuid,
    pub encrypted_blob: Vec<u8>,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
    pub metadata: SafeMatadata,
}

#[derive(Debug, thiserror::Error)]
pub enum SafeError {
    #[error("Safe not found")]
    NotFound,
    #[error("Invalid request data")]
    InvalidData,
    #[error("Internal server error")]
    InternalError,
}

impl Safe {
    pub fn new(encrypted_blob: Vec<u8>) -> Self {
        let now = SystemTime::now();

        let metadata = SafeMatadata {
            size: encrypted_blob.len(),
            version: VERSION_NUMBER,
        };
        Safe {
            id: Uuid::new_v4(),
            encrypted_blob,
            created_at: now,
            updated_at: now,
            metadata,
        }
    }

    pub fn update(&mut self, encrypted_blob: Option<Vec<u8>>, metadata: Option<SafeMatadata>) {
        if let Some(blob) = encrypted_blob {
            self.encrypted_blob = blob;
        }
        if let Some(meta) = metadata {
            self.metadata = meta;
        }
        self.updated_at = SystemTime::now();
    }

    // pub fn get_id(&self) -> Uuid {
    //     self.id
    // }
}