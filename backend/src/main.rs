mod routes;
mod storage;

use axum::serve;
use tokio::net::TcpListener;
use std::net::SocketAddr;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    //Create AppState

    // create routes
    let app = routes::router::create_router();
    println!("Router created successfully");

    //create addr
    let addr = SocketAddr::from(([127, 0, 0, 1], 8000));

    // Listener
    let listener = TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");
    println!("Listening on {}", addr);

    // axum::serve
    serve(listener, app)
        .await
        .expect("Failed to start server");
    Ok(())

}