use tauri::Manager;
use tauri::AppHandle;
use std::fs;
use std::io::Read;
use std::path::PathBuf;
use aes_gcm::Aes256Gcm; // Or another AES variant
use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::aead::generic_array::GenericArray;
use rand::RngCore;

const TOKEN_FILE: &str = "token.json";
const SECRET_KEY: &[u8; 32] = b"my_very_secret_key_1234567890123"; // todo replace with a securely generated key

fn app_data_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap_or_else(|_| {
        panic!("Failed to resolve app data directory");
    })
}

fn encrypt(data: &[u8]) -> Vec<u8> {
    let cipher = Aes256Gcm::new_from_slice(SECRET_KEY).expect("Invalid key length");
    let mut nonce = [0u8; 12]; // 96-bit nonce
    rand::thread_rng().fill_bytes(&mut nonce); // Generate a random nonce

    let encrypted = cipher.encrypt(GenericArray::from_slice(&nonce), data)
        .expect("Encryption failed");

    [encrypted.as_slice(), &nonce].concat() // Append nonce to the end
}

fn decrypt(data: &[u8]) -> Vec<u8> {
    let cipher = Aes256Gcm::new_from_slice(SECRET_KEY).expect("Invalid key length");
    let (encrypted, nonce) = data.split_at(data.len() - 12); // Separate data and nonce
    cipher.decrypt(nonce.into(), encrypted).expect("Decryption failed")
}

#[tauri::command]
fn save_token(app: AppHandle, token: String) -> Result<(), String> {
    let path = app_data_path(&app).join(TOKEN_FILE);
    let encrypted = encrypt(token.as_bytes());
    fs::write(path, encrypted).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_token(app: AppHandle) -> Result<String, String> {
    let path = app_data_path(&app).join(TOKEN_FILE);
    let mut file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut encrypted = Vec::new();
    file.read_to_end(&mut encrypted).map_err(|e| e.to_string())?;
    let decrypted = decrypt(&encrypted);
    String::from_utf8(decrypted).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_token(app: AppHandle) -> Result<(), String> {
    let path = app_data_path(&app).join(TOKEN_FILE);
    fs::remove_file(&path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, save_token, get_token, remove_token])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
