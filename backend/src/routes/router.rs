use axum::{
    Router,
    routing::{get, post, put},
    http::Method,
};
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    set_header::SetResponseHeaderLayer,
};
use hyper::http::{HeaderName, HeaderValue};
use axum::http::header;
use crate::routes::safe::handlers::{create_safe, edit_safe, get_safe};

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

    // Create the router with routes
    Router::new()
    // Add nested routes here
        .route("/", get(|| async { "Hello, World!" }))
        .route("/health", get(|| async { "OK" }))
        .route("/create-safe", post(create_safe))
        .route("/get-safe", get(get_safe))
        .route("/edit-safe", put(edit_safe))
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

