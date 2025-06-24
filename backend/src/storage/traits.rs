use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use crate::routes::safe::models::{Safe, SafeError};
use uuid::Uuid;

#[async_trait::async_trait]
pub trait SafeStorage: Send + Sync {
    async fn create_safe(&self, safe: Safe) -> Result<Safe, SafeError>;
    async fn edit_safe(&self, id: &str, safe: Safe) -> Result<Safe, SafeError>;
    async fn get_safe(&self, id: &str) -> Result<Safe, SafeError>;
    async fn delete_safe(&self, id: &str) -> Result<(), SafeError>;
    async fn list_safes(&self) -> Result<Vec<Safe>, SafeError>;
}

#[derive(Debug, Clone)]
pub struct InMemoryStorage {
    safes: Arc<RwLock<HashMap<Uuid, Safe>>>,
}

impl InMemoryStorage {
    pub fn new() -> Self {
        Self {
            safes: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    // TODO : enlever le unwrap() et gérer les erreurs
    pub fn count(&self) -> usize {
        let safes = self.safes.read().unwrap();
        safes.len()
    }

    pub fn clear(&self) {
        let mut safes = self.safes.write().unwrap();
        safes.clear();
    }
}

#[async_trait::async_trait]
impl SafeStorage for InMemoryStorage {
    async fn create_safe(&self, safe: Safe) -> Result<Safe, SafeError> {
        let mut safes = self.safes.write()
            .map_err(|_| SafeError::InternalError)?;

        if safes.contains_key(&safe.id) {
            return Err(SafeError::InvalidData);
        }

        let id = safe.id.clone();
        safes.insert(id, safe.clone());

        println!("{:?}", safe);

        println!("Safe created with ID: {}", safe.id);
        Ok(safe)
    }

    async fn edit_safe(&self, id: &str, safe: Safe) -> Result<Safe, SafeError> {
        let mut safes = self.safes.write()
            .map_err(|_| SafeError::InternalError)?;

        let uuid = Uuid::parse_str(id).map_err(|_| SafeError::InvalidData)?;
        if let Some(existing_safe) = safes.get_mut(&uuid) {
            existing_safe.update(Some(safe.encrypted_blob), Some(safe.metadata));
            Ok(existing_safe.clone())
        } else {
            Err(SafeError::NotFound)
        }
    }

    async fn get_safe(&self, id: &str) -> Result<Safe, SafeError> {
        let safes = self.safes.read()
            .map_err(|_| SafeError::InternalError)?;

        let uuid = Uuid::parse_str(id).map_err(|_| SafeError::InvalidData)?;
        safes.get(&uuid)
            .cloned()
            .ok_or(SafeError::NotFound)
    }

    async fn delete_safe(&self, id: &str) -> Result<(), SafeError> {
        let mut safes = self.safes.write()
            .map_err(|_| SafeError::InternalError)?;

        let uuid = Uuid::parse_str(id).map_err(|_| SafeError::InvalidData)?;
        if safes.remove(&uuid).is_some() {
            Ok(())
        } else {
            Err(SafeError::NotFound)
        }
    }

    async fn list_safes(&self) -> Result<Vec<Safe>, SafeError> {
        let safes = self.safes.read()
            .map_err(|_| SafeError::InternalError)?;

        Ok(safes.values().cloned().collect())
    }
}

pub struct SafeStorageFactory;
impl SafeStorageFactory {
    pub fn create_in_memory_storage() -> Box<dyn SafeStorage> {
        Box::new(InMemoryStorage::new())
    }
}
