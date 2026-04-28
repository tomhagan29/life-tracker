use std::{
  fs,
  net::{TcpListener, TcpStream},
  path::{Path, PathBuf},
  process::{Child, Command, Stdio},
  sync::Mutex,
  thread,
  time::{Duration, Instant},
};

use anyhow::{bail, Context, Result};
use tauri::{Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};

const HOST: &str = "127.0.0.1";
const SERVER_STARTUP_TIMEOUT: Duration = Duration::from_secs(30);

struct NextServer(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(NextServer(Mutex::new(None)))
    .invoke_handler(tauri::generate_handler![save_user_export])
    .setup(|app| {
      let main_window =
        WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
          .title("Life Tracker")
          .inner_size(1280.0, 860.0)
          .min_inner_size(960.0, 640.0)
          .build()?;

      let app_handle = app.handle().clone();
      thread::spawn(move || load_app_when_ready(app_handle, main_window));

      Ok(())
    })
    .on_window_event(|window, event| {
      if matches!(event, WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed) {
        stop_next_server(window.app_handle());
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running Life Tracker");
}

#[tauri::command]
fn save_user_export(
  app: tauri::AppHandle,
  filename: String,
  contents: String,
) -> std::result::Result<String, String> {
  let safe_filename = safe_export_filename(&filename);
  let downloads_dir = app
    .path()
    .download_dir()
    .map_err(|error| format!("Could not find Downloads folder: {error}"))?;
  fs::create_dir_all(&downloads_dir)
    .map_err(|error| format!("Could not create Downloads folder: {error}"))?;

  let output_path = available_export_path(downloads_dir.join(safe_filename));
  fs::write(&output_path, contents)
    .map_err(|error| format!("Could not save export file: {error}"))?;

  Ok(output_path.to_string_lossy().into_owned())
}

fn load_app_when_ready(app: tauri::AppHandle, main_window: WebviewWindow) {
  match app_url(&app) {
    Ok(url) => {
      if let Err(error) = main_window.navigate(url) {
        eprintln!("Could not load Life Tracker: {error:#}");
      }
    }
    Err(error) => {
      eprintln!("Could not start Life Tracker: {error:#}");
      show_startup_error(&main_window);
    }
  }
}

fn app_url(app: &tauri::AppHandle) -> Result<url::Url> {
  let url = if cfg!(debug_assertions) {
    "http://127.0.0.1:3000".to_string()
  } else {
    start_next_server(app)?
  };

  Ok(url.parse()?)
}

fn start_next_server(app: &tauri::AppHandle) -> Result<String> {
  let port = find_open_port()?;
  let resource_dir = app.path().resource_dir().context("Could not resolve Tauri resource directory")?;
  let standalone_dir = resource_dir.join(".next").join("standalone");
  let server_path = standalone_dir.join("server.js");
  let node_path = resource_dir.join("bin").join(node_file_name());

  if !server_path.exists() {
    bail!("Missing bundled Next server at {}", server_path.display());
  }

  if !node_path.exists() {
    bail!("Missing bundled Node runtime at {}", node_path.display());
  }

  let app_data_dir = app.path().app_data_dir().context("Could not resolve app data directory")?;
  fs::create_dir_all(&app_data_dir).context("Could not create app data directory")?;

  let database_path = app_data_dir.join("life-tracker.sqlite");

  let log_file = fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(app_data_dir.join("server.log"))
    .context("Could not open server log file")?;
  let log_stderr = log_file.try_clone().context("Could not duplicate server log file handle")?;

  let mut child = Command::new(node_path)
    .arg(server_path)
    .current_dir(standalone_dir)
    .env("DATABASE_URL", sqlite_url(&database_path))
    .env("HOSTNAME", HOST)
    .env("PORT", port.to_string())
    .env("NODE_ENV", "production")
    .stdin(Stdio::null())
    .stdout(Stdio::from(log_file))
    .stderr(Stdio::from(log_stderr))
    .spawn()
    .context("Could not start bundled Next server")?;

  if let Err(error) = wait_for_server(port) {
    let _ = child.kill();
    let _ = child.wait();
    return Err(error);
  }

  let state = app.state::<NextServer>();
  *state.0.lock().expect("Next server state lock poisoned") = Some(child);

  Ok(format!("http://{HOST}:{port}"))
}

fn stop_next_server(app: &tauri::AppHandle) {
  let state = app.state::<NextServer>();

  if let Some(mut child) = state.0.lock().expect("Next server state lock poisoned").take() {
    let _ = child.kill();
    let _ = child.wait();
  };
}

fn safe_export_filename(filename: &str) -> String {
  Path::new(filename)
    .file_name()
    .and_then(|name| name.to_str())
    .filter(|name| name.ends_with(".json"))
    .unwrap_or("life-tracker-export.json")
    .to_string()
}

fn available_export_path(path: PathBuf) -> PathBuf {
  if !path.exists() {
    return path;
  }

  let parent = path.parent().map(Path::to_path_buf).unwrap_or_default();
  let stem = path
    .file_stem()
    .and_then(|stem| stem.to_str())
    .unwrap_or("life-tracker-export");
  let extension = path.extension().and_then(|extension| extension.to_str());

  for index in 1.. {
    let filename = match extension {
      Some(extension) => format!("{stem}-{index}.{extension}"),
      None => format!("{stem}-{index}"),
    };
    let candidate = parent.join(filename);

    if !candidate.exists() {
      return candidate;
    }
  }

  unreachable!("export path search should always return an available filename")
}

fn find_open_port() -> Result<u16> {
  let listener = TcpListener::bind((HOST, 0)).context("Could not bind to a localhost port")?;
  Ok(listener.local_addr().context("Could not read bound port")?.port())
}

fn wait_for_server(port: u16) -> Result<()> {
  let started_at = Instant::now();

  while started_at.elapsed() < SERVER_STARTUP_TIMEOUT {
    if TcpStream::connect((HOST, port)).is_ok() {
      return Ok(());
    }

    thread::sleep(Duration::from_millis(300));
  }

  bail!("Timed out waiting for bundled Next server")
}

fn show_startup_error(window: &WebviewWindow) {
  let _ = window.set_title("Life Tracker failed to start");
  let _ = window.eval(
    r#"
      document.body.innerHTML = "";
      const main = document.createElement("main");
      main.style.maxWidth = "34rem";
      main.style.padding = "2rem";
      main.style.lineHeight = "1.5";
      const heading = document.createElement("h1");
      heading.textContent = "Life Tracker could not start";
      heading.style.fontSize = "1.25rem";
      heading.style.margin = "0 0 0.75rem";
      const details = document.createElement("p");
      details.textContent = "The bundled app server did not become ready in time. Close and reopen the app to try again.";
      details.style.margin = "0";
      main.append(heading, details);
      document.body.append(main);
    "#,
  );
}

fn node_file_name() -> &'static str {
  if cfg!(windows) {
    "node.exe"
  } else {
    "node"
  }
}

fn sqlite_url(path: &std::path::Path) -> String {
  format!("file:{}", path.to_string_lossy().replace('\\', "/"))
}
