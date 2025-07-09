"use client"

import { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

export default function TestConnection() {
  const [connected, setConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  useEffect(() => {
    addLog("Component mounted, attempting connection...")
    
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001"
    addLog(`Connecting to: ${wsUrl}`)
    
    const socketInstance = io(wsUrl, {
      transports: ['polling', 'websocket']
    })

    socketInstance.on('connect', () => {
      addLog('✅ Connected successfully!')
      setConnected(true)
    })

    socketInstance.on('connect_error', (error) => {
      addLog(`❌ Connection error: ${error.message}`)
      setConnected(false)
    })

    socketInstance.on('disconnect', () => {
      addLog('🔌 Disconnected')
      setConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">WebSocket Connection Test</h1>
      <div className={`text-lg mb-4 ${connected ? 'text-green-500' : 'text-red-500'}`}>
        Status: {connected ? 'Connected' : 'Disconnected'}
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h2 className="font-bold mb-2">Logs:</h2>
        {logs.map((log, i) => (
          <div key={i} className="font-mono text-sm">{log}</div>
        ))}
      </div>
    </div>
  )
}