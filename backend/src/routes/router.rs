use axum::{
    Router,
    routing::{get, post, put}
};
use tower_http::cors::CorsLayer;
use tower_http::set_header::SetResponseHeaderLayer;
use hyper::http::HeaderValue;
use std::error::Error;

use crate::routes::safe::{create_safe, edit_safe};

#[axum::debug_handler]
pub fn create_router(cors: CorsLayer, security_header: SetResponseHeaderLayer<HeaderValue>) -> Result<Router, Box<dyn Error>> {
    // Create the router with routes
    let app = Router::new()
    // Add nested routes here
        .route("/", get(|| async { "Hello, World!" }))
        .route("/health", get(|| async { "OK" }))
        .route("/create-safe", post(create_safe))
        .route("get-safe", get(get_safe))
        .route("/edit-safe", put(edit_safe))

        .layer(cors)
        .layer(security_header);
    Ok(app)
}