

use axum::response::Response as HttpResponse;

pub async fn create_safe() -> Result<HttpResponse, axum::Error> {
    println!("Creating a safe...");
    HttpResponse::builder()
        .status(200)
        .body("Safe created successfully".into())
        .map_err(|e| axum::Error::new(e))
}

pub async fn edit_safe() -> Result<HttpResponse, axum::Error> {
    println!("Editing a safe...");
    HttpResponse::builder()
        .status(200)
        .body("Safe edited successfully".into())
        .map_err(|e| axum::Error::new(e))
}

pub async fn get_safe() -> Result<HttpResponse, axum::Error> {
    println!("Retrieving a safe...");
    HttpResponse::builder()
        .status(200)
        .body("Safe retrieved successfully".into())
        .map_err(|e| axum::Error::new(e))
}