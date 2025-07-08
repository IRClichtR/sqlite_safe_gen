use serde::{Deserialize, Serialize};
use serde_with::{serde_as, TimestampMilliSeconds};
use uuid::Uuid;
use std::time::SystemTime;
use axum::response::IntoResponse;
use axum::Json;
use serde_json::json;

const VERSION_NUMBER: u32 = 1;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Safe {
    pub id: Uuid,
    pub encrypted_blob: Vec<u8>,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
    pub metadata: SafeMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SafeMetadata {
    pub size: usize,
    pub version: u32,
}

#[derive(Debug, Deserialize)]
pub struct CreateSafeRequest {
    pub id: Option<Uuid>,
    pub encrypted_blob: Vec<u8>,
    pub metadata: SafeMetadata,
}

#[derive(Debug, Deserialize)]
pub struct EditSafeRequest {
    pub id: Uuid,
    pub encrypted_blob: Option<Vec<u8>>,
    pub metadata: Option<SafeMetadata>,
}

// #[derive(Debug, Deserialize)]
// pub struct GetSafeRequest {
//     pub id: Uuid,
// }

#[serde_as]
#[derive(Debug, Serialize)]
pub struct CreateSafeResponse {
    pub id: Uuid,
    #[serde_as(as = "TimestampMilliSeconds<String>")]
    pub created_at: SystemTime,
    pub metadata: SafeMetadata,
}

#[serde_as]
#[derive(Debug, Serialize)]
pub struct EditSafeResponse {
    pub id: Uuid,
    #[serde_as(as = "TimestampMilliSeconds<String>")]
    pub updated_at: SystemTime,
    pub metadata: SafeMetadata,
}

#[serde_as]
#[derive(Debug, Serialize, Deserialize)]
pub struct GetSafeResponse {
    pub id: Uuid,
    pub encrypted_blob: Vec<u8>,
    #[serde_as(as = "TimestampMilliSeconds<String>")]
    pub created_at: SystemTime,
    #[serde_as(as = "TimestampMilliSeconds<String>")]
    pub updated_at: SystemTime,
    pub metadata: SafeMetadata,
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

impl IntoResponse for SafeError {
    fn into_response(self) -> axum::response::Response {
        let (status, error_message) = match self {
            SafeError::NotFound => (axum::http::StatusCode::NOT_FOUND, "Safe not found"),
            SafeError::InvalidData => (axum::http::StatusCode::BAD_REQUEST, "Invalid request data"),
            SafeError::InternalError => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
        };

        let body = json!({
            "error": error_message,
            "timestamp": SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        });

        (status, Json(body)).into_response()
    }
}

impl Safe {
    pub fn new(id: Option<Uuid>, encrypted_blob: Vec<u8>) -> Self {
        let now = SystemTime::now();

        let metadata = SafeMetadata {
            size: encrypted_blob.len(),
            version: VERSION_NUMBER,
        };
        Safe {
            id: id.unwrap_or_else(|| Uuid::new_v4()),
            encrypted_blob,
            created_at: now,
            updated_at: now,
            metadata,
        }
    }

    pub fn update(&mut self, encrypted_blob: Option<Vec<u8>>, metadata: Option<SafeMetadata>) {
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