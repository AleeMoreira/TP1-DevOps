const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
let tasks = []; // Arreglo para almacenar las tareas

const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    const filePath = path.join(__dirname, 'index.html');

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading the page');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content, 'utf-8');
    });
  } else if (req.url === '/tasks' && req.method === 'GET') {
    // Obtener las tareas
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tasks));
  } else if (req.url === '/tasks' && req.method === 'POST') {
    // Crear una nueva tarea
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const newTask = JSON.parse(body);
      tasks.push(newTask);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Task created', tasks }));
    });
  } else if (req.url.startsWith('/tasks/') && req.method === 'PUT') {
    // Actualizar una tarea existente
    const id = req.url.split('/')[2];
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const updatedTask = JSON.parse(body);
      tasks[id] = updatedTask;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Task updated', tasks }));
    });
  } else if (req.url.startsWith('/tasks/') && req.method === 'DELETE') {
    // Eliminar una tarea existente
    const id = req.url.split('/')[2];
    tasks.splice(id, 1);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Task deleted', tasks }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
});
