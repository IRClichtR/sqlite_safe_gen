use axum::{
    extract::{Path, State}, http::StatusCode, response::{IntoResponse}, Json
};
use crate::routes::{router::AppState, safe::models::GetSafeResponse};
use crate::routes::safe::models::{
    CreateSafeRequest, CreateSafeResponse, 
    EditSafeRequest, EditSafeResponse,
    SafeError, 
    Safe};

pub async fn create_safe(
    State(state): State<AppState>,
    Json(payload): Json<CreateSafeRequest>,
) -> Result<impl IntoResponse, SafeError> {
    if payload.encrypted_blob.is_empty() {
        return Err(SafeError::InvalidData);
    }

    // TO_DO Validate rest of the payload

    let safe_id = match payload.id {
        Some(id) => id,
        None => uuid::Uuid::new_v4(),
    };
    
    let safe = Safe::new(Some(safe_id), payload.encrypted_blob);

    let created_safe = state
        .storage
        .create_safe(safe)
        .await
        .map_err(|_| SafeError::InternalError)?;

    let response = CreateSafeResponse {
        id: created_safe.id,
        created_at: created_safe.created_at,
        metadata: created_safe.metadata,
    };

    println!("Safe created with ID: {}", response.id);

    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn get_safe(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, SafeError> {
    println!("do i crash here ? {}", id);
    println!("Retrieving safe with ID: {}", id);

    // TO_DO Validate rest of the payload

    println!("Fetching safe from storage...");
    let safe = state.storage.get_safe(id.as_str()).await?;
    let response = GetSafeResponse {
        id: safe.id,
        encrypted_blob: safe.encrypted_blob,
        created_at: safe.created_at,
        updated_at: safe.updated_at,
        metadata: safe.metadata,
    };

    println!("Safe retrieved successfully.");
    Ok((StatusCode::OK, Json(response)))
}


pub async fn edit_safe(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<EditSafeRequest>,
) -> Result<impl IntoResponse, SafeError> {
    println!("Editing safe with ID: {}", id);

    let existing_safe = state
        .storage
        .get_safe(id.as_str())
        .await
        .map_err(|_| SafeError::InternalError)?;

    // TO_DO Validate rest of the payload

    let mut updated_safe = existing_safe;

    updated_safe.update(
        payload.encrypted_blob,
        payload.metadata,
    );

    if updated_safe.encrypted_blob.is_empty() {
        return Err(SafeError::InvalidData);
    }

    let final_safe = state
        .storage
        .edit_safe(id.as_str(), updated_safe)
        .await
        .map_err(|_| SafeError::InternalError)?;
    

    let response = EditSafeResponse {
        id: final_safe.id,
        updated_at: final_safe.updated_at,
        metadata: final_safe.metadata,
    };

    println!("Safe edited successfully with ID: {}", response.id);
    
    Ok((StatusCode::OK, Json(response)))
}

pub async fn list_safes(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, SafeError> {
    println!("Listing all safes...");

    let safes = state
        .storage
        .list_safes()
        .await
        .map_err(|_| SafeError::InternalError)?;

    if safes.is_empty() {
        println!("No safes found.");
        return Ok((StatusCode::OK, Json(vec![])));
    }

    println!("Safes retrieved successfully.");
    
    Ok((StatusCode::OK, Json(safes)))
}

pub async fn delete_safe(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, SafeError> {
    println!("Deleting safe with ID: {}", id);

    state
        .storage
        .delete_safe(id.as_str())
        .await
        .map_err(|_| SafeError::InternalError)?;

    println!("Safe deleted successfully with ID: {}", id);
    
    Ok(StatusCode::NO_CONTENT)
}
