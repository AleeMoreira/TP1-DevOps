# Utilizamos la imagen oficial de Node.js
FROM node:14

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiamos el package.json y package-lock.json
COPY package*.json ./

# Instalamos las dependencias de la aplicación
RUN npm install

# Copiamos el resto del código de la aplicación
COPY src /usr/src/app

# Exponemos el puerto en el que corre tu aplicación (ajusta según sea necesario)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
