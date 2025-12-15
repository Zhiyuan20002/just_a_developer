import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// 扩展 electronAPI，确保 send 方法可用
const extendedElectronAPI = {
  ...electronAPI,
  ipcRenderer: {
    ...electronAPI.ipcRenderer,
    send: (channel: string, ...args: unknown[]) => {
      ipcRenderer.send(channel, ...args)
    },
    on: (channel: string, listener: (...args: unknown[]) => void) => {
      ipcRenderer.on(channel, (_event, ...args) => listener(_event, ...args))
      return ipcRenderer
    },
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel)
      return ipcRenderer
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', extendedElectronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = extendedElectronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
