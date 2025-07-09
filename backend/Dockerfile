FROM node:18-alpine

# Install system dependencies and AWS CLI
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash \
    git \
    openssh-client \
    curl \
    unzip \
    aws-cli

# Install Terraform
RUN curl -O https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_arm64.zip && \
    unzip terraform_1.5.7_linux_arm64.zip && \
    mv terraform /usr/local/bin/ && \
    rm terraform_1.5.7_linux_arm64.zip

# Install Packer
RUN curl -O https://releases.hashicorp.com/packer/1.9.4/packer_1.9.4_linux_arm64.zip && \
    unzip packer_1.9.4_linux_arm64.zip && \
    mv packer /usr/local/bin/ && \
    rm packer_1.9.4_linux_arm64.zip

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]
