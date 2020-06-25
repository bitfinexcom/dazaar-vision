const electron = require('electron')

const { BrowserWindow, app } = electron
let win

const userDataDir = arg('--user-data-dir')
if (userDataDir) process.env.DAZAAR_VISION_USER_DATA_DIR = userDataDir

app.setName('Dazaar Vision')

app.on('ready', function () {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true
    }
  })
  win.loadURL('file://' + require.resolve('./index.html'))

  if (process.argv.includes('--dev-tools')) {
    win.webContents.on('did-finish-load', () => win.webContents.openDevTools({ mode: 'detach' }))
    win.webContents.on('context-menu', onContextMenu)
  }
})

function onContextMenu (event, params) {
  const { editFlags } = params
  const hasText = params.selectionText.trim().length > 0
  const can = type => editFlags[`can${type}`] && hasText

  const menuTpl = [{
    type: 'separator'
  }, {
    id: 'cut',
    label: 'Cut',
    // Needed because of macOS limitation:
    // https://github.com/electron/electron/issues/5860
    role: can('Cut') ? 'cut' : '',
    enabled: can('Cut'),
    visible: params.isEditable
  }, {
    id: 'copy',
    label: 'Copy',
    role: can('Copy') ? 'copy' : '',
    enabled: can('Copy'),
    visible: params.isEditable || hasText
  }, {
    id: 'paste',
    label: 'Paste',
    role: editFlags.canPaste ? 'paste' : '',
    enabled: editFlags.canPaste,
    visible: params.isEditable
  }, {
    type: 'separator'
  }, {
    id: 'inspect',
    label: 'Inspect Element',
    click () {
      win.inspectElement(params.x, params.y)

      if (win.webContents.isDevToolsOpened()) {
        win.webContents.devToolsWebContents.focus()
      }
    }
  }, {
    type: 'separator'
  }]

  const menu = electron.Menu.buildFromTemplate(menuTpl)
  menu.popup(win)
}

function arg (name) {
  for (const a of process.argv) {
    if (a === name) {
      return process.argv[process.argv.indexOf(name) + 1]
    }
    if (a.split('=')[0] === name) {
      return a.split('=')[1]
    }
  }
  return null
}
