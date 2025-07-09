"use client"

import { useState, useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Play, Square, Trash2, FileText, CheckCircle, Eye, EyeOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggle } from "@/components/theme-toggle"

interface ConfigValues {
  // AWS credentials
  AWS_ACCESS_KEY_ID: string
  AWS_SECRET_ACCESS_KEY: string
  
  // AWS deployment options
  AWS_REGION: string
  AWS_DEFAULT_REGION: string
  EC2_TYPE: string
  ASG_MIN_SIZE: string
  ASG_MAX_SIZE: string
  ASG_DESIRED_CAPACITY: string

  // LucidLink filespace variables
  FILESPACE1: string
  FSUSER1: string
  LLPASSWD1: string
  ROOTPOINT1: string
  FSVERSION: string

  // versitygw variables
  ROOT_ACCESS_KEY: string
  ROOT_SECRET_KEY: string
  VGW_IAM_DIR: string
  VGW_VIRTUAL_DOMAIN: string
  FQDOMAIN: string
}

const defaultValues: ConfigValues = {
  AWS_ACCESS_KEY_ID: "",
  AWS_SECRET_ACCESS_KEY: "",
  AWS_REGION: "us-east-1",
  AWS_DEFAULT_REGION: "us-east-1",
  EC2_TYPE: "c6id.4xlarge",
  ASG_MIN_SIZE: "1",
  ASG_MAX_SIZE: "3",
  ASG_DESIRED_CAPACITY: "1",
  FILESPACE1: "",
  FSUSER1: "",
  LLPASSWD1: "",
  ROOTPOINT1: "/",
  FSVERSION: "3",
  ROOT_ACCESS_KEY: "",
  ROOT_SECRET_KEY: "",
  VGW_IAM_DIR: "/media/lucidlink/.vgw",
  VGW_VIRTUAL_DOMAIN: "",
  FQDOMAIN: "",
}

const awsRegions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
]

const ec2Types = [
  "c6id.4xlarge",
  "c6id.2xlarge",
  "c6id.xlarge",
  "c6id.large",
  "c5d.4xlarge",
  "c5d.2xlarge",
  "m6id.4xlarge",
  "m6id.2xlarge",
]

// const environments = ["dev", "staging", "prod"] // Not used in this CLI

export default function DeploymentUI() {
  console.log('DeploymentUI component mounting...')
  const [config, setConfig] = useState<ConfigValues>(defaultValues)
  // const [environment, setEnvironment] = useState<string>("dev") // Not used
  const [isRunning, setIsRunning] = useState(false)
  const [currentCommand, setCurrentCommand] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<string>('')
  
  // Password visibility state
  const [showPasswords, setShowPasswords] = useState({
    awsAccessKey: false,
    awsSecretKey: false,
    llPassword: false,
    s3AccessKey: false,
    s3SecretKey: false
  })

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('Initializing WebSocket connection...')
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001"
    console.log('Connecting to WebSocket at:', wsUrl)
    const socketInstance = io(wsUrl, {
      transports: ['polling', 'websocket']
    })
    
    socketInstance.on('connect', () => {
      console.log('Socket.IO connected successfully')
      setConnected(true)
      setTerminalOutput(prev => prev + "✅ Connected to deployment server\n$ ")
    })

    socketInstance.on('disconnect', () => {
      console.log('Socket.IO disconnected')
      setConnected(false)
      setTerminalOutput(prev => prev + "\n❌ Disconnected from server\n")
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error)
      setConnected(false)
    })

    socketInstance.on('output', (data: string) => {
      console.log('Received output:', data)
      setTerminalOutput(prev => prev + data)
    })

    socketInstance.on('error', (error: string) => {
      setTerminalOutput(prev => prev + `\n❌ Error: ${error}\n`)
      setIsRunning(false)
      setCurrentCommand(null)
    })

    socketInstance.on('command-complete', () => {
      setIsRunning(false)
      setCurrentCommand(null)
      setTerminalOutput(prev => prev + "\n$ ")
    })

    socketInstance.on('input', (data) => {
      socketInstance.emit('input', data)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  // Terminal is now using simple HTML display - no xterm.js needed

  const updateConfig = (key: keyof ConfigValues, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const saveConfig = async () => {
    if (!socket || !connected) return

    socket.emit('save-config', config)
    setTerminalOutput(prev => prev + "\n💾 Saving configuration...\n")
  }

  const executeCommand = async (command: string) => {
    if (!socket || !connected || isRunning) return

    console.log('Executing command:', command)
    setIsRunning(true)
    setCurrentCommand(command)

    // Add command to terminal output
    setTerminalOutput(prev => prev + `\n$ ${command}\n`)

    // Build the actual command
    const fullCommand = `./deploy.sh ${command}`
    console.log('Sending command to backend:', fullCommand)
    
    // Send command with config
    socket.emit('execute-command', {
      command: fullCommand,
      config: config
    })
  }

  const stopCommand = () => {
    if (socket && isRunning) {
      socket.emit('stop-command')
      setTerminalOutput(prev => prev + "\n^C\nStopping command...\n")
    }
  }

  const validateConfig = (): string[] => {
    const errors: string[] = []

    // AWS credentials
    if (!config.AWS_ACCESS_KEY_ID) errors.push("AWS Access Key ID is required")
    if (!config.AWS_SECRET_ACCESS_KEY) errors.push("AWS Secret Access Key is required")

    // LucidLink configuration
    if (!config.FILESPACE1) errors.push("Filespace name is required")
    if (!config.FSUSER1) errors.push("LucidLink user email is required")
    if (!config.LLPASSWD1) errors.push("LucidLink password is required")
    
    // VersityGW configuration
    if (!config.ROOT_ACCESS_KEY) errors.push("S3 Access Key is required")
    if (!config.ROOT_SECRET_KEY) errors.push("S3 Secret Key is required")
    if (!config.VGW_VIRTUAL_DOMAIN) errors.push("S3 Virtual Domain is required")
    if (!config.FQDOMAIN) errors.push("Base Domain is required")

    return errors
  }

  const configErrors = validateConfig()
  const canExecute = configErrors.length === 0 && !isRunning && connected

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">AWS S3 Gateway Deployment</h1>
            <p className="text-muted-foreground">
              Deploy and manage your S3 Gateway infrastructure
            </p>
            <Badge variant={connected ? "default" : "destructive"}>
              {connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
            {configErrors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Please fill in all required fields: {configErrors.join(", ")}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* AWS Credentials */}
              <Card>
                <CardHeader>
                  <CardTitle>AWS Credentials</CardTitle>
                  <CardDescription>Configure AWS access credentials for deployment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="aws-access-key">AWS Access Key ID *</Label>
                    <div className="relative">
                      <Input
                        id="aws-access-key"
                        type={showPasswords.awsAccessKey ? "text" : "password"}
                        placeholder="AKIA..."
                        value={config.AWS_ACCESS_KEY_ID}
                        onChange={(e) => updateConfig("AWS_ACCESS_KEY_ID", e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('awsAccessKey')}
                      >
                        {showPasswords.awsAccessKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="aws-secret-key">AWS Secret Access Key *</Label>
                    <div className="relative">
                      <Input
                        id="aws-secret-key"
                        type={showPasswords.awsSecretKey ? "text" : "password"}
                        placeholder="Enter secret access key"
                        value={config.AWS_SECRET_ACCESS_KEY}
                        onChange={(e) => updateConfig("AWS_SECRET_ACCESS_KEY", e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('awsSecretKey')}
                      >
                        {showPasswords.awsSecretKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY && (
                    <Button
                      onClick={() => executeCommand("validate")}
                      disabled={!connected || isRunning}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Test AWS Connection
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* AWS Deployment Options */}
              <Card>
                <CardHeader>
                  <CardTitle>AWS Deployment Options</CardTitle>
                  <CardDescription>Configure AWS region and EC2 instance settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>AWS Region</Label>
                    <Select
                      value={config.AWS_REGION}
                      onValueChange={(value) => {
                        updateConfig("AWS_REGION", value)
                        updateConfig("AWS_DEFAULT_REGION", value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {awsRegions.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>EC2 Instance Type</Label>
                    <Select value={config.EC2_TYPE} onValueChange={(value) => updateConfig("EC2_TYPE", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ec2Types.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="asg-min">Min Size</Label>
                      <Input
                        id="asg-min"
                        type="number"
                        value={config.ASG_MIN_SIZE}
                        onChange={(e) => updateConfig("ASG_MIN_SIZE", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="asg-max">Max Size</Label>
                      <Input
                        id="asg-max"
                        type="number"
                        value={config.ASG_MAX_SIZE}
                        onChange={(e) => updateConfig("ASG_MAX_SIZE", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="asg-desired">Desired</Label>
                      <Input
                        id="asg-desired"
                        type="number"
                        value={config.ASG_DESIRED_CAPACITY}
                        onChange={(e) => updateConfig("ASG_DESIRED_CAPACITY", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* LucidLink Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>LucidLink Configuration</CardTitle>
                  <CardDescription>Configure LucidLink filespace connection settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="filespace">Filespace Name *</Label>
                    <Input
                      id="filespace"
                      placeholder="mycompany.dmpfs"
                      value={config.FILESPACE1}
                      onChange={(e) => updateConfig("FILESPACE1", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="fsuser">User *</Label>
                    <Input
                      id="fsuser"
                      type="email"
                      placeholder="user@company.com"
                      value={config.FSUSER1}
                      onChange={(e) => updateConfig("FSUSER1", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="llpasswd">Password *</Label>
                    <div className="relative">
                      <Input
                        id="llpasswd"
                        type={showPasswords.llPassword ? "text" : "password"}
                        value={config.LLPASSWD1}
                        onChange={(e) => updateConfig("LLPASSWD1", e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('llPassword')}
                      >
                        {showPasswords.llPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="rootpoint">Root Point</Label>
                      <Input
                        id="rootpoint"
                        value={config.ROOTPOINT1}
                        onChange={(e) => updateConfig("ROOTPOINT1", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>FS Version</Label>
                      <Select value={config.FSVERSION} onValueChange={(value) => updateConfig("FSVERSION", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">Version 2 (Legacy)</SelectItem>
                          <SelectItem value="3">Version 3 (Latest)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* VersityGW Configuration */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>VersityGW S3 Configuration</CardTitle>
                  <CardDescription>Configure S3 API credentials and domain settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="access-key">S3 Access Key *</Label>
                      <div className="relative">
                        <Input
                          id="access-key"
                          type={showPasswords.s3AccessKey ? "text" : "password"}
                          value={config.ROOT_ACCESS_KEY}
                          onChange={(e) => updateConfig("ROOT_ACCESS_KEY", e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('s3AccessKey')}
                        >
                          {showPasswords.s3AccessKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="secret-key">S3 Secret Key *</Label>
                      <div className="relative">
                        <Input
                          id="secret-key"
                          type={showPasswords.s3SecretKey ? "text" : "password"}
                          value={config.ROOT_SECRET_KEY}
                          onChange={(e) => updateConfig("ROOT_SECRET_KEY", e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('s3SecretKey')}
                        >
                          {showPasswords.s3SecretKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="virtual-domain">S3 Virtual Domain *</Label>
                      <Input
                        id="virtual-domain"
                        placeholder="s3.yourcompany.com"
                        value={config.VGW_VIRTUAL_DOMAIN}
                        onChange={(e) => updateConfig("VGW_VIRTUAL_DOMAIN", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="base-domain">Base Domain *</Label>
                      <Input
                        id="base-domain"
                        placeholder="yourcompany.com"
                        value={config.FQDOMAIN}
                        onChange={(e) => updateConfig("FQDOMAIN", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="iam-dir">VGW IAM Directory</Label>
                    <Input
                      id="iam-dir"
                      value={config.VGW_IAM_DIR}
                      onChange={(e) => updateConfig("VGW_IAM_DIR", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Command Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Deployment Commands</CardTitle>
                <CardDescription>Execute deployment commands with the current configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button
                    onClick={() => executeCommand("plan")}
                    disabled={!canExecute}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Plan Changes
                  </Button>
                  <Button
                    onClick={() => executeCommand("apply --build-ami --auto-approve")}
                    disabled={!canExecute}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Build AMI & Deploy
                  </Button>
                  <Button
                    onClick={() => executeCommand("apply --auto-approve")}
                    disabled={!canExecute}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Deploy Only
                  </Button>
                  <Button
                    onClick={() => executeCommand("destroy --auto-approve")}
                    disabled={!canExecute}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Destroy Infrastructure
                  </Button>
                  <Button
                    onClick={() => executeCommand("validate")}
                    disabled={!canExecute}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Validate Config
                  </Button>
                  <Button
                    onClick={saveConfig}
                    disabled={!connected || configErrors.length > 0}
                    variant="outline"
                    className="flex items-center gap-2 ml-auto"
                  >
                    <FileText className="h-4 w-4" />
                    Save Config
                  </Button>
                </div>
                {isRunning && (
                  <div className="mt-4 flex items-center gap-4">
                    <Badge variant="secondary" className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Running: {currentCommand}
                    </Badge>
                    <Button
                      onClick={stopCommand}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Square className="h-3 w-3" />
                      Stop
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
        
        {/* Terminal Output */}
        <Card className="mt-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Terminal Output</h3>
              <Button 
                onClick={() => setTerminalOutput('')} 
                variant="outline" 
                size="sm"
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              className="h-[600px] w-full overflow-auto p-4 font-mono text-sm text-green-400 bg-gray-900 border-0"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {terminalOutput || "Terminal ready. Execute a command to see output..."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}