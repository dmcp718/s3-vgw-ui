const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(helmet());
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const WORKSPACE_DIR = '/workspace/terraform';

// Store active processes per socket
const activeProcesses = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    workspace: WORKSPACE_DIR
  });
});

// Create environment-specific config file
async function createConfigFile(config, environment) {
  const configPath = path.join(WORKSPACE_DIR, 'packer/script/config_vars.txt');
  
  const configContent = `##--AWS credentials--##
# AWS access credentials
export AWS_ACCESS_KEY_ID="${config.AWS_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${config.AWS_SECRET_ACCESS_KEY}"

##--AWS deployment options--##
# AWS region where infrastructure will be deployed
AWS_REGION="${config.AWS_REGION}"
export AWS_DEFAULT_REGION="${config.AWS_REGION}"

# EC2 instance type for S3 Gateway (must have instance storage)
EC2_TYPE="${config.EC2_TYPE}"

# Auto Scaling Group configuration
ASG_MIN_SIZE="${config.ASG_MIN_SIZE}"
ASG_MAX_SIZE="${config.ASG_MAX_SIZE}"
ASG_DESIRED_CAPACITY="${config.ASG_DESIRED_CAPACITY}"

##--LucidLink filespace variables--##
# LucidLink filespace name
FILESPACE1="${config.FILESPACE1}"

# LucidLink user email for authentication
FSUSER1="${config.FSUSER1}"

# LucidLink user password (will be encrypted in AMI)
LLPASSWD1="${config.LLPASSWD1}"

# Root point in filespace (usually "/")
ROOTPOINT1="${config.ROOTPOINT1}"

# LucidLink version: "2" for legacy, "3" for latest
FSVERSION="${config.FSVERSION}"

##--versitygw variables--##
# S3 API root credentials
ROOT_ACCESS_KEY="${config.ROOT_ACCESS_KEY}"
ROOT_SECRET_KEY="${config.ROOT_SECRET_KEY}"

# Directory for VersityGW IAM data
VGW_IAM_DIR="${config.VGW_IAM_DIR}"

# Your domain for S3 virtual-hosted-style requests
VGW_VIRTUAL_DOMAIN="${config.VGW_VIRTUAL_DOMAIN}"

# Your base domain
FQDOMAIN="${config.FQDOMAIN}"
`;

  try {
    await fs.writeFile(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing config file:', error);
    return false;
  }
}

// Execute shell command with proper environment
function executeCommand(socket, commandData) {
  const { command, config } = commandData;
  
  console.log(`Executing command: ${command}`);
  
  // Create config file first
  createConfigFile(config, 'default').then((success) => {
    if (!success) {
      socket.emit('error', 'Failed to create configuration file');
      return;
    }

    // Set up environment variables
    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: config.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: config.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: config.AWS_REGION,
      AWS_DEFAULT_REGION: config.AWS_REGION
    };
    
    // Remove AWS_PROFILE if it's empty to avoid config issues
    if (!env.AWS_PROFILE || env.AWS_PROFILE === '') {
      delete env.AWS_PROFILE;
    }

    // Execute the command
    console.log('Spawning command in directory:', WORKSPACE_DIR);
    console.log('Full command:', command);
    console.log('Environment variables:', {
      AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID ? '[PRESENT]' : '[MISSING]',
      AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY ? '[PRESENT]' : '[MISSING]',
      AWS_REGION: env.AWS_REGION
    });
    
    // First emit that we're starting
    socket.emit('output', `Executing: ${command}\r\n`);
    
    const child = spawn('/bin/bash', ['-c', command], {
      cwd: WORKSPACE_DIR,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Store the process so we can kill it if needed
    activeProcesses.set(socket.id, child);
    
    // Set up output handlers immediately
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('STDOUT:', output);
        socket.emit('output', output);
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('STDERR:', output);
        socket.emit('output', output);
      });
    }

    child.on('close', (code) => {
      activeProcesses.delete(socket.id);
      socket.emit('output', `\r\nProcess exited with code ${code}\r\n`);
      socket.emit('command-complete');
    });

    child.on('error', (error) => {
      activeProcesses.delete(socket.id);
      socket.emit('error', `Failed to start command: ${error.message}`);
    });

    // Handle input from terminal
    socket.on('input', (data) => {
      if (child && !child.killed) {
        child.stdin.write(data);
      }
    });
  });
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send welcome message
  console.log('Sending welcome message to client:', socket.id);
  socket.emit('output', 'Connected to S3 Gateway Deployment Server\r\n');
  socket.emit('output', `Workspace: ${WORKSPACE_DIR}\r\n`);
  socket.emit('output', '$ ');

  // Handle command execution
  socket.on('execute-command', (commandData) => {
    executeCommand(socket, commandData);
  });

  // Handle configuration saving
  socket.on('save-config', async (config) => {
    try {
      const success = await createConfigFile(config, 'current');
      if (success) {
        socket.emit('output', '\r\n✅ Configuration saved successfully\r\n$ ');
      } else {
        socket.emit('output', '\r\n❌ Failed to save configuration\r\n$ ');
      }
    } catch (error) {
      socket.emit('output', `\r\n❌ Error saving config: ${error.message}\r\n$ `);
    }
  });

  // Handle command stop
  socket.on('stop-command', () => {
    const process = activeProcesses.get(socket.id);
    if (process && !process.killed) {
      process.kill('SIGINT');
      socket.emit('output', '\r\n^C Command stopped\r\n$ ');
    }
  });

  // Handle generic input (for interactive commands)
  socket.on('input', (data) => {
    const process = activeProcesses.get(socket.id);
    if (process && !process.killed) {
      process.stdin.write(data);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const process = activeProcesses.get(socket.id);
    if (process && !process.killed) {
      process.kill();
    }
    activeProcesses.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Enhanced Backend server running on port ${PORT}`);
  console.log(`Workspace directory: ${WORKSPACE_DIR}`);
});