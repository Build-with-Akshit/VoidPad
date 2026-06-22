#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use tauri::{Builder, generate_context, generate_handler, AppHandle};
use tauri_plugin_dialog::DialogExt;
use gray_matter::engine::YAML;
use gray_matter::Matter;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct TreeNode {
    id: String,
    name: String,
    #[serde(rename = "type")]
    node_type: String, // "page" or "directory"
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

#[tauri::command]
async fn select_workspace(app: AppHandle) -> Result<Option<String>, String> {
    // using tauri-plugin-dialog
    let result = app.dialog().file().pick_folder();
    match result {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
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
                
                // check if it has children (a folder with same name)
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
    // sort nodes
    nodes.sort_by(|a, b| a.name.cmp(&b.name));
    nodes
}

#[tauri::command]
async fn read_workspace(workspace_path: String) -> Result<String, String> {
    let path = Path::new(&workspace_path);
    if !path.exists() {
        return Err("Workspace does not exist".into());
    }
    
    // ensure .assets exists
    let assets_dir = path.join(".assets");
    if !assets_dir.exists() {
        let _ = fs::create_dir_all(&assets_dir);
    }

    let tree = build_tree(path, path);
    serde_json::to_string(&tree).map_err(|e| e.to_string())
}

#[tauri::command]
async fn read_page(workspace_path: String, page_id: String) -> Result<String, String> {
    let file_path = Path::new(&workspace_path).join(format!("{}.md", page_id));
    if !file_path.exists() {
        return Err("Page not found".into());
    }

    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    
    // Parse frontmatter
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(&content);
    
    let mut title = Path::new(&page_id).file_name().unwrap_or_default().to_string_lossy().to_string();
    let mut icon = "📄".to_string();
    let mut cover = "".to_string();

    if let Some(data) = parsed.data {
        if let Some(t) = data["title"].as_string() {
            title = t;
        }
        if let Some(i) = data["icon"].as_string() {
            icon = i;
        }
        if let Some(c) = data["cover"].as_string() {
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
async fn save_page(
    workspace_path: String,
    page_id: String,
    title: String,
    markdown_text: String,
    metadata: PageMetadata
) -> Result<String, String> {
    let file_path = Path::new(&workspace_path).join(format!("{}.md", page_id));
    
    // Build the pure markdown file with YAML frontmatter
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
async fn create_page(
    workspace_path: String,
    parent_id: Option<String>,
    name: String
) -> Result<String, String> {
    let base_path = Path::new(&workspace_path);
    let mut target_dir = base_path.to_path_buf();
    
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
async fn rename_page(
    workspace_path: String,
    page_id: String,
    new_name: String
) -> Result<String, String> {
    let base_path = Path::new(&workspace_path);
    let old_file = base_path.join(format!("{}.md", page_id));
    
    if !old_file.exists() {
        return Err("File not found".into());
    }

    let parent_dir = old_file.parent().unwrap_or(base_path);
    let mut final_name = new_name.clone();
    let mut new_file = parent_dir.join(format!("{}.md", final_name));
    
    let mut counter = 1;
    while new_file.exists() {
        final_name = format!("{} ({})", new_name, counter);
        new_file = parent_dir.join(format!("{}.md", final_name));
        counter += 1;
    }

    fs::rename(&old_file, &new_file).map_err(|e| e.to_string())?;

    let old_dir = base_path.join(&page_id);
    let new_dir = parent_dir.join(&final_name);
    if old_dir.exists() && old_dir.is_dir() {
        let _ = fs::rename(&old_dir, &new_dir);
    }

    let parent_rel = parent_dir.strip_prefix(base_path).unwrap_or(Path::new("")).to_string_lossy().replace("\\", "/");
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
async fn delete_page(
    workspace_path: String,
    page_id: String
) -> Result<String, String> {
    let base_path = Path::new(&workspace_path);
    let file_path = base_path.join(format!("{}.md", page_id));
    let dir_path = base_path.join(&page_id);

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
    workspace_path: String,
    file_name: String,
    bytes: Vec<u8>
) -> Result<String, String> {
    let base_path = Path::new(&workspace_path);
    let assets_dir = base_path.join(".assets");
    if !assets_dir.exists() {
        let _ = fs::create_dir_all(&assets_dir);
    }

    let timestamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis();
    let safe_name = format!("{}-{}", timestamp, file_name.replace(" ", "_"));
    let target_file = assets_dir.join(&safe_name);

    fs::write(&target_file, &bytes).map_err(|e| e.to_string())?;

    // Return custom protocol URL
    // We register the `asset` protocol to read from workspace/.assets
    let asset_url = format!("asset://localhost/.assets/{}", safe_name);

    let res = OperationResult {
        success: true,
        page_id: None,
        new_page_id: None,
        asset_url: Some(asset_url),
        error: None,
    };
    serde_json::to_string(&res).map_err(|e| e.to_string())
}

fn main() {
    Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(generate_handler![
            select_workspace,
            read_workspace,
            read_page,
            save_page,
            create_page,
            rename_page,
            delete_page,
            save_asset_bytes
        ])
        // To handle asset://localhost/... 
        // Tauri v2 custom protocol requires some specific setup
        // But for simplicity, we can also just use the default capabilities
        // and standard local fetching, but let's just stick with invoke_handler for now.
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
