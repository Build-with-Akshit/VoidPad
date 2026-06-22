#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use tauri::{Builder, AppHandle, Manager};
use gray_matter::engine::YAML;
use gray_matter::Matter;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct TreeNode {
    id: String,
    name: String,
    #[serde(rename = "type")]
    node_type: String,
    path: String,
    children: Option<Vec<TreeNode>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct PageMetadata {
    icon: String,
    cover: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct PageData {
    title: String,
    metadata: PageMetadata,
    #[serde(rename = "markdownText")]
    markdown_text: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct OperationResult {
    success: bool,
    #[serde(rename = "pageId")]
    page_id: Option<String>,
    #[serde(rename = "newPageId")]
    new_page_id: Option<String>,
    #[serde(rename = "assetUrl")]
    asset_url: Option<String>,
    error: Option<String>,
}

fn get_notes_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let document_dir = app.path().document_dir().map_err(|e| e.to_string())?;
    let notes_dir = document_dir.join("VoidPad_Notes");
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?;
    }
    Ok(notes_dir)
}

fn build_tree(dir_path: &Path, base_path: &Path) -> Vec<TreeNode> {
    let mut nodes = Vec::new();
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            
            if file_name.starts_with('.') {
                continue;
            }

            let rel_path = path.strip_prefix(base_path).unwrap_or(&path).to_string_lossy().replace("\\", "/");

            if path.is_file() && path.extension().unwrap_or_default() == "md" {
                let id = rel_path.trim_end_matches(".md").to_string();
                let name = file_name.trim_end_matches(".md").to_string();
                
                let dir_counterpart = path.with_extension("");
                let mut children = None;
                if dir_counterpart.is_dir() {
                    children = Some(build_tree(&dir_counterpart, base_path));
                }

                nodes.push(TreeNode {
                    id,
                    name,
                    node_type: "page".to_string(),
                    path: rel_path.to_string(),
                    children,
                });
            }
        }
    }
    nodes.sort_by(|a, b| a.name.cmp(&b.name));
    nodes
}

#[tauri::command]
async fn get_all_notes(app: AppHandle) -> Result<String, String> {
    let notes_dir = get_notes_dir(&app)?;
    let tree = build_tree(&notes_dir, &notes_dir);
    serde_json::to_string(&tree).map_err(|e| e.to_string())
}

#[tauri::command]
async fn read_note(app: AppHandle, page_id: String) -> Result<String, String> {
    let notes_dir = get_notes_dir(&app)?;
    let file_path = notes_dir.join(format!("{}.md", page_id));
    if !file_path.exists() {
        return Err("Note not found".into());
    }

    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(&content);
    
    let mut title = Path::new(&page_id).file_name().unwrap_or_default().to_string_lossy().to_string();
    let mut icon = "📄".to_string();
    let mut cover = "".to_string();

    if let Some(data) = parsed.data {
        if let Ok(t) = data["title"].as_string() {
            title = t;
        }
        if let Ok(i) = data["icon"].as_string() {
            icon = i;
        }
        if let Ok(c) = data["cover"].as_string() {
            cover = c;
        }
    }

    let page_data = PageData {
        title,
        metadata: PageMetadata { icon, cover },
        markdown_text: parsed.content,
    };

    serde_json::to_string(&page_data).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_note(
    app: AppHandle,
    page_id: String,
    title: String,
    markdown_text: String,
    metadata: PageMetadata
) -> Result<String, String> {
    let notes_dir = get_notes_dir(&app)?;
    let file_path = notes_dir.join(format!("{}.md", page_id));
    
    let frontmatter = format!(
        "---\ntitle: \"{}\"\nicon: \"{}\"\ncover: \"{}\"\n---\n\n{}",
        title.replace("\"", "\\\""),
        metadata.icon.replace("\"", "\\\""),
        metadata.cover.replace("\"", "\\\""),
        markdown_text
    );

    if let Some(parent) = file_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    fs::write(&file_path, frontmatter).map_err(|e| e.to_string())?;

    let res = OperationResult {
        success: true,
        page_id: Some(page_id),
        new_page_id: None,
        asset_url: None,
        error: None,
    };
    serde_json::to_string(&res).map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_note(
    app: AppHandle,
    parent_id: Option<String>,
    name: String
) -> Result<String, String> {
    let notes_dir = get_notes_dir(&app)?;
    let mut target_dir = notes_dir.clone();
    
    if let Some(ref pid) = parent_id {
        target_dir = target_dir.join(pid);
        let _ = fs::create_dir_all(&target_dir);
    }

    let mut final_name = name.clone();
    let mut file_path = target_dir.join(format!("{}.md", final_name));
    let mut counter = 1;
    while file_path.exists() {
        final_name = format!("{} ({})", name, counter);
        file_path = target_dir.join(format!("{}.md", final_name));
        counter += 1;
    }

    let frontmatter = format!("---\ntitle: \"{}\"\nicon: \"📄\"\ncover: \"\"\n---\n\n", final_name);
    fs::write(&file_path, frontmatter).map_err(|e| e.to_string())?;

    let new_id = if let Some(ref pid) = parent_id {
        format!("{}/{}", pid, final_name)
    } else {
        final_name.clone()
    };

    let res = OperationResult {
        success: true,
        page_id: Some(new_id),
        new_page_id: None,
        asset_url: None,
        error: None,
    };
    serde_json::to_string(&res).map_err(|e| e.to_string())
}

#[tauri::command]
async fn rename_note(
    app: AppHandle,
    page_id: String,
    new_name: String
) -> Result<String, String> {
    let notes_dir = get_notes_dir(&app)?;
    let old_file = notes_dir.join(format!("{}.md", page_id));
    
    if !old_file.exists() {
        return Err("File not found".into());
    }

    let parent_dir = old_file.parent().unwrap_or(&notes_dir);
    let mut final_name = new_name.clone();
    let mut new_file = parent_dir.join(format!("{}.md", final_name));
    
    let mut counter = 1;
    while new_file.exists() {
        final_name = format!("{} ({})", new_name, counter);
        new_file = parent_dir.join(format!("{}.md", final_name));
        counter += 1;
    }

    fs::rename(&old_file, &new_file).map_err(|e| e.to_string())?;

    let old_dir = notes_dir.join(&page_id);
    let new_dir = parent_dir.join(&final_name);
    if old_dir.exists() && old_dir.is_dir() {
        let _ = fs::rename(&old_dir, &new_dir);
    }

    let parent_rel = parent_dir.strip_prefix(&notes_dir).unwrap_or(Path::new("")).to_string_lossy().replace("\\", "/");
    let new_id = if parent_rel.is_empty() {
        final_name
    } else {
        format!("{}/{}", parent_rel, final_name)
    };

    let res = OperationResult {
        success: true,
        page_id: Some(page_id),
        new_page_id: Some(new_id),
        asset_url: None,
        error: None,
    };
    serde_json::to_string(&res).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_note(app: AppHandle, page_id: String) -> Result<String, String> {
    let notes_dir = get_notes_dir(&app)?;
    let file_path = notes_dir.join(format!("{}.md", page_id));
    let dir_path = notes_dir.join(&page_id);

    if file_path.exists() {
        let _ = trash::delete(&file_path);
    }
    if dir_path.exists() {
        let _ = trash::delete(&dir_path);
    }

    let res = OperationResult {
        success: true,
        page_id: Some(page_id),
        new_page_id: None,
        asset_url: None,
        error: None,
    };
    serde_json::to_string(&res).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_asset_bytes(
    app: AppHandle,
    file_name: String,
    bytes: Vec<u8>
) -> Result<String, String> {
    let notes_dir = get_notes_dir(&app)?;
    let assets_dir = notes_dir.join(".assets");
    if !assets_dir.exists() {
        let _ = fs::create_dir_all(&assets_dir);
    }

    let timestamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis();
    let safe_name = format!("{}-{}", timestamp, file_name.replace(" ", "_"));
    let target_file = assets_dir.join(&safe_name);

    fs::write(&target_file, &bytes).map_err(|e| e.to_string())?;

    let absolute_path = target_file.to_string_lossy().to_string();

    let res = OperationResult {
        success: true,
        page_id: None,
        new_page_id: None,
        asset_url: Some(absolute_path),
        error: None,
    };
    serde_json::to_string(&res).map_err(|e| e.to_string())
}

fn main() {
    Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_all_notes,
            read_note,
            save_note,
            create_note,
            rename_note,
            delete_note,
            save_asset_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

