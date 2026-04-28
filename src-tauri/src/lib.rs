use std::{
  fs,
  net::{TcpListener, TcpStream},
  process::{Child, Command, Stdio},
  sync::Mutex,
  thread,
  time::{Duration, Instant},
};

use anyhow::{bail, Context, Result};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

const HOST: &str = "127.0.0.1";
const FIRST_PORT: u16 = 32473;
const LAST_PORT: u16 = 32573;

struct NextServer(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(NextServer(Mutex::new(None)))
    .setup(|app| {
      let url = if cfg!(debug_assertions) {
        "http://127.0.0.1:3000".to_string()
      } else {
        start_next_server(app)?
      };

      WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url.parse()?))
        .title("Life Tracker")
        .inner_size(1280.0, 860.0)
        .min_inner_size(960.0, 640.0)
        .build()?;

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

fn start_next_server(app: &mut tauri::App) -> Result<String> {
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
  let mut child = Command::new(node_path)
    .arg(server_path)
    .current_dir(standalone_dir)
    .env("DATABASE_URL", sqlite_url(&database_path))
    .env("HOSTNAME", HOST)
    .env("PORT", port.to_string())
    .env("NODE_ENV", "production")
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .spawn()
    .context("Could not start bundled Next server")?;

  if let Err(error) = wait_for_server(port) {
    let _ = child.kill();
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
  };
}

fn find_open_port() -> Result<u16> {
  for port in FIRST_PORT..LAST_PORT {
    if TcpListener::bind((HOST, port)).is_ok() {
      return Ok(port);
    }
  }

  bail!("Could not find an open localhost port for the app server")
}

fn wait_for_server(port: u16) -> Result<()> {
  let started_at = Instant::now();

  while started_at.elapsed() < Duration::from_secs(90) {
    if TcpStream::connect((HOST, port)).is_ok() {
      return Ok(());
    }

    thread::sleep(Duration::from_millis(300));
  }

  bail!("Timed out waiting for bundled Next server")
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
