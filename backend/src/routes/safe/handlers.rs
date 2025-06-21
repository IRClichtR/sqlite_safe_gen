

use axum::response::IntoResponse;

pub async fn create_safe() -> impl IntoResponse {
    println!("Creating a safe...");
    "safe created successfully"
}

pub async fn edit_safe() -> impl IntoResponse {
    println!("Editing a safe...");
    "Safe edited successfully"
}

pub async fn get_safe() -> impl IntoResponse {
    println!("Retrieving a safe...");
    "Safe retrieved successfully"
}