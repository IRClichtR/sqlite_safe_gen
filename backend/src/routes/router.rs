use axum::{
    Router,
    routing::{get, post, put, delete},
    http::Method,
};
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    set_header::SetResponseHeaderLayer,
};
use hyper::http::{HeaderName, HeaderValue};
use axum::http::header;
use std::sync::Arc;
use crate::{
    routes::safe::handlers::{
        create_safe, 
        edit_safe, 
        get_safe, 
        list_safes,
        delete_safe
    }, 
    storage::traits::{SafeStorage, SafeStorageFactory},
};

#[derive(Clone)]
pub struct AppState {
    pub storage: Arc<dyn SafeStorage>,
}

impl AppState {
    pub fn new(storage: Box<dyn SafeStorage>) -> Self {
        Self {
            storage: Arc::from(storage),
         }
    }
}

pub async fn create_router() -> Router {
    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(HeaderValue::from_static("http://localhost:3000")))
        .allow_methods(vec![Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("authorization"),
        ]);

    // middleware config
    let security_headers = SetResponseHeaderLayer::overriding(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );

    // Create the application state
    let storage = SafeStorageFactory::create_in_memory_storage();
    let app_state = AppState::new(storage);

    // Create the router with routes
    Router::new()
    // Add nested routes here
        .route("/", get(|| async { "Safe API ready to serve data!" }))
        .route("/health", get(|| async { "OK" }))
        .route("/safes", post(create_safe))
        .route("/safes", get(list_safes))
        .route("/safes/:id", get(get_safe))
        .route("/safes/:id", put(edit_safe))
        .route("/safes/:id", delete(delete_safe))
        .with_state(app_state)
        .layer(cors)
        .layer(security_headers)
}



//==========================================================================================================
//=============================================== TEST ROUTER ==============================================
//==========================================================================================================
#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt; // pour la méthode `oneshot`

    #[tokio::test]
    async fn test_all_routes() {
        let app = create_router();

        // Test de la route GET (qui devrait fonctionner)
        let router = app;
        let response = router
            .await
            .oneshot(
                Request::builder()
                    .uri("/get-safe")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // Test de la route POST
        let app = create_router();
        let router = app.await;
        let response = router
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/create-safe")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // Test de la route PUT
        let app = create_router();
        let router = app.await;
        let response = router
            .oneshot(
                Request::builder()
                    .method("PUT")
                    .uri("/edit-safe")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_method_not_allowed() {
        let app = create_router();

        let router = app.await;
        let response = router
            .oneshot(
                Request::builder()
                    .uri("/create-safe")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
    }
}

