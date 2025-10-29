FROM ubuntu:25.10

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-pip \
    ffmpeg \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment for auto-editor
RUN python3 -m venv $VIRTUAL_ENV

# Install auto-editor in the virtual environment
RUN pip install --no-cache-dir auto-editor

# --- Ensure /tmp is writable ---
RUN mkdir -p /tmp && chmod 777 /tmp

# Set up working directory
WORKDIR /app

# Copy package.json and install Node.js dependencies
COPY package.json ./
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install --omit=dev

# Copy the rest of your application
COPY . .

# Expose port and define the default command
EXPOSE 3000
CMD ["node", "src/app.js"]