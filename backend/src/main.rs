mod routes;


use axum::http::Method;
use axum::{
    Router,
    routing::get,
};
use hyper::header;
use tokio::net::TcpListener;
use std::net::SocketAddr;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    set_header::SetResponseHeaderLayer,
};
use hyper::http::{HeaderName, HeaderValue};
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    //Create AppState
    //Configure CORS
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

    //Create the router
    let app = routes::router::create_router(cors, security_headers)
        .expect("Failed to create router");

    //create addr
    let addr = SocketAddr::from(([127, 0, 0, 1], 8000));

    // Listener
    let listener = TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");
    println!("Listening on {}", addr);

    // axum::serve
    axum::serve(listener, app)
        .await
        .expect("Failed to start server");
    Ok(())

}
