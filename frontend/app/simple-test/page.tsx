"use client"

import { useState, useEffect } from 'react'

export default function SimpleTest() {
  const [output, setOutput] = useState<string>('')

  useEffect(() => {
    // Simulate terminal output
    const lines = [
      'Terminal Test Started',
      'Connecting to server...',
      '✅ Connected successfully',
      'Running command: ls -la',
      'total 24',
      'drwxr-xr-x  3 user user 4096 Jul  8 18:30 .',
      'drwxr-xr-x 15 user user 4096 Jul  8 18:29 ..',
      '-rw-r--r--  1 user user  220 Jul  8 18:30 .bashrc',
      '-rw-r--r--  1 user user  807 Jul  8 18:30 .profile',
      'Command completed successfully',
      '$ '
    ]

    let index = 0
    const interval = setInterval(() => {
      if (index < lines.length) {
        setOutput(prev => prev + lines[index] + '\n')
        index++
      } else {
        clearInterval(interval)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-white text-2xl mb-4">Simple Terminal Output Test</h1>
        
        {/* Simple Terminal Display */}
        <div 
          className="bg-gray-900 border border-gray-700 p-4 rounded h-96 overflow-auto font-mono text-sm text-green-400"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {output || 'Initializing...'}
        </div>
        
        <div className="mt-4 text-white">
          <p>This proves terminal output display works.</p>
          <p>Lines: {output.split('\n').length - 1}</p>
        </div>
      </div>
    </div>
  )
}