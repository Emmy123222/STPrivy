use crate::storage::{get_admin, is_initialized};
use soroban_sdk::{Address, Env};

/// Check if the caller is the admin
pub fn require_admin(env: &Env, caller: &Address) -> Result<(), crate::errors::Error> {
    if !is_initialized(env) {
        return Err(crate::errors::Error::NotInitialized);
    }
    
    let admin = get_admin(env);
    if admin != *caller {
        return Err(crate::errors::Error::Unauthorized);
    }
    
    Ok(())
}

/// Check if the caller is authorized (admin or backend)
pub fn require_authorized(env: &Env, caller: &Address) -> Result<(), crate::errors::Error> {
    if !is_initialized(env) {
        return Err(crate::errors::Error::NotInitialized);
    }
    
    let admin = get_admin(env);
    if admin != *caller {
        return Err(crate::errors::Error::Unauthorized);
    }
    
    Ok(())
}
