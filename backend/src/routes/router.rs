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

pub fn create_router() -> Router {
    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(HeaderValue::from_static("http://localhost:5173")))
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

    let router = Router::new()
        .route("/", get(|| async { "Safe API ready to serve data!" }))
        .route("/health", get(|| async { "OK" }))
        .route("/safes", post(create_safe))
        .route("/safes", get(list_safes))
        .route("/safes/{id}", get(get_safe))
        .route("/safes/{id}", put(edit_safe))
        .route("/safes/{id}", delete(delete_safe))
        .with_state(app_state)
        .layer(cors)
        .layer(security_headers);

    router
}



//==========================================================================================================
//=============================================== TEST ROUTER ==============================================
//==========================================================================================================
#[cfg(test)]
mod tests {
    use axum::{
        body::Body,
        http::{Request, StatusCode, Method},
    };
    use tower::ServiceExt;
    use serde_json::json;
    use crate::routes::router::{create_router};
    use crate::routes::safe::models::{SafeMetadata};


    fn create_mock_blob_storage() -> Vec<u8> {
        b"encrypted_data_example_1234567890".to_vec()
    }

    #[tokio::test]
    async fn test_health_enpoint() {

        let app = create_router();

        let response = app 
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .method(Method::GET)
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), 1024).await.unwrap();
        assert_eq!(&body[..], b"OK");
    }

    #[tokio::test]
    async fn create_safe_success() {
        let app = create_router();

        let request_body = json!({
            "encrypted_blob": create_mock_blob_storage(),
            "metadata": SafeMetadata {
                size: create_mock_blob_storage().len(),
                version: 1,
            }
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/safes")
                    .method(Method::POST)
                    .header("Content-Type", "application/json")
                    .body(Body::from(request_body.to_string()))
                    .unwrap()
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);

        let body = axum::body::to_bytes(response.into_body(), 1024).await.unwrap();
        let response_json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert!(response_json["id"].is_string());
        assert!(response_json["created_at"].is_string());
        assert_eq!(response_json["metadata"]["size"], create_mock_blob_storage().len() as u64);
        assert_eq!(response_json["metadata"]["version"], 1);
    }

    #[tokio::test]
    async fn test_empty_blob() {
        let app = create_router();

        let request_body = json!({
            "encrypted_blob": Vec::<u8>::new(),
            "metadata": SafeMetadata {
                size: 0,
                version: 1,
            }
        });

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/safes")
                    .method(Method::POST)
                    .header("Content-Type", "application/json")
                    .body(Body::from(request_body.to_string()))
                    .unwrap()
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}