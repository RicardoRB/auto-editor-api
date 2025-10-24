# syntax=docker/dockerfile:1
FROM node:18-alpine

# Define un alias para las dependencias de compilación (build-base)
# que son necesarias para que pip compile componentes nativos de Python en Alpine.
ENV BUILD_DEPS="build-base python3-dev"

# Instalar dependencias del sistema y de compilación
RUN apk add --no-cache \
    $BUILD_DEPS \
    python3 \
    py3-pip \
    # auto-editor necesita ffmpeg para procesar videos
    ffmpeg

# Crear y activar entorno virtual para auto-editor
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
# Añadir la ruta del entorno virtual al PATH global
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Instalar auto-editor en el entorno virtual
# Usa la versión de PyPI (la estándar) o la de GitHub si la prefieres (descomenta la alternativa)
RUN pip3 install --no-cache-dir auto-editor

# --- ALTERNATIVA: Para instalar la versión de GitHub (si es lo que necesitas) ---
# RUN apk add --no-cache git && \
#     pip3 install --no-cache-dir 'git+https://github.com/WyattBlue/auto-editor.git' && \
#     apk del git

# Opcional: Eliminar las dependencias de compilación para reducir el tamaño de la imagen.
RUN apk del $BUILD_DEPS

WORKDIR /app

# copiar sólo archivos de lock/manifest para aprovechar cache
COPY package.json ./

# instalar solo producción (si necesitas dev deps en build o dev, ajustar)
RUN npm install --prod

# copiar el resto del proyecto (node_modules está en .dockerignore)
COPY . .

EXPOSE 3000
CMD ["node", "src/app.js"]