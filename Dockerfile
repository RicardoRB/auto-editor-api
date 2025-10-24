# syntax=docker/dockerfile:1
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    build-base \
    python3 \
    python3-dev \
    py3-pip \
    # auto-editor necesita ffmpeg para procesar videos
    ffmpeg

# Crear y activar entorno virtual para auto-editor
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Instalar auto-editor en el entorno virtual
RUN pip3 install --no-cache-dir auto-editor && \
    # Asegurar que el ejecutable tenga permisos correctos
    chmod +x /opt/venv/bin/auto-editor && \
    # Crear enlace simbólico para mantener compatibilidad con ambas rutas
    mkdir -p /opt/venv/lib/python3.12/site-packages/auto_editor/bin && \
    ln -s /opt/venv/bin/auto-editor /opt/venv/lib/python3.12/site-packages/auto_editor/bin/auto-editor

WORKDIR /app

# copiar sólo archivos de lock/manifest para aprovechar cache
COPY package.json ./

# instalar solo producción (si necesitas dev deps en build o dev, ajustar)
RUN npm install --prod

# copiar el resto del proyecto (node_modules está en .dockerignore)
COPY . .

EXPOSE 3000
CMD ["node", "src/app.js"]
