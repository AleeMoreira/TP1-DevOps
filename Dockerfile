#Specify a base image
FROM node:alpine

#Specify a working directory
WORKDIR "C:\Users\Ale\UTN\5toAÑO\DEVOPS - CULTURA, HERRAMIENTAS Y PROCESOS\PRÁCTICA\TP1\TP1-DevOps"

#Copy the dependencies file
COPY ./package.json ./

#Install dependencies
RUN npm install 

#Copy remaining files
COPY ./ ./

#Default command
CMD ["npm","start"]