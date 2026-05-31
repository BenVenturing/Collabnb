const { app, BrowserWindow, Tray, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let window = null;

// Hide the dock icon so the app only appears in the menu bar
if (process.platform === 'darwin') {
  app.dock.hide();
}

// Generate the 22x22 template tray icon from base64 (chat bubble template icon)
const base64Icon = 'iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAABy0lEQVQ4y6WVv2sUURTFz3szu8kuiUaNEgRFQbSxsFC0sLAQ/wALi62NhYWlhYWlhYWlhYWlhYWlhYWlhX+AhYWlhYWFhSAYRDEa4667M/PexbDZ7G52d4N5cDMM950P7rknXGicwwxgGrALGAfGQ+42cBVo1DnnO2aZAcwA5oEpwEQp3wS+An8HnHOBY5b5oYkCngAroecO0Klz1nfsU+McrgKvgL7QcxMY1TnqOz5yLgVWARV4BwyEvheAYef0f5xzAdWA18Bg6HkE9DsnT82eE5gHVALeAIOh5zEw6ORp2nMC84AHwGPgZeh5Cow7eT7tOYH5wAjwEngVep4CE06enD3nEhcDz4G3oecpMO3kuW3PuUQFngLvQ88yMOvk6drzeuIe4AXwPvQ8A2adPGXPeZ64CngJvA89K8CckyfveWbETeAV8CH0rABzTp6W5zknXgGvgcuhZwVYdvLkPM8z4nPgDXA19KwAK06elue1xBVwDfgy9KwAK06e/Z5rGfE1cDP0/ANWnTy1v027wDXgG3Az9KwCq06e2v/X10T8DfgG3A49q8Cak6c+9E0GboXe/8C6k6f+L2kDuBl6PwIbnTw1y/wH+k2xLp1iP9IAAAAASUVORK5CYII=';

const iconPath = path.join(__dirname, 'iconTemplate.png');
if (!fs.existsSync(iconPath)) {
  fs.writeFileSync(iconPath, Buffer.from(base64Icon, 'base64'));
}

app.whenReady().then(() => {
  createTray();
  createWindow();
});

function createTray() {
  tray = new Tray(iconPath);
  tray.setToolTip('Ollama Chat Widget');
  tray.on('click', () => {
    toggleWindow();
  });
}

function createWindow() {
  window = new BrowserWindow({
    width: 380,
    height: 550,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  window.loadFile(path.join(__dirname, 'chat.html'));

  // Hide the window when it loses focus
  window.on('blur', () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide();
    }
  });
}

const toggleWindow = () => {
  if (window.isVisible()) {
    window.hide();
  } else {
    showWindow();
  }
};

const showWindow = () => {
  const position = getWindowPosition();
  window.setPosition(position.x, position.y, false);
  window.show();
  window.focus();
};

const getWindowPosition = () => {
  const windowBounds = window.getBounds();
  const trayBounds = tray.getBounds();

  // Center window horizontally below the tray icon
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  // Position window vertically below the tray icon
  const y = Math.round(trayBounds.y + trayBounds.height + 4);

  return { x, y };
};
