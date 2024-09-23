const http = require('http');
const fs = require('fs');
const path = require('path');
const redis = require('redis');

// Crear cliente de Redis
const client = redis.createClient({
  host: 'redis-server',
  port: 6379
});

client.on('error', (err) => {
  console.error('Error connecting to Redis', err);
});

const port = process.env.PORT || 3000;

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
    // Obtener tareas pendientes desde Redis
    client.lrange('tasks', 0, -1, (err, tasks) => {
      if (err) {
        res.writeHead(500);
        res.end('Error fetching tasks');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tasks.map(task => JSON.parse(task))));
    });
  } else if (req.url === '/tasks' && req.method === 'POST') {
    // Crear una nueva tarea
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const newTask = JSON.parse(body);
      newTask.completed = false; // Nueva tarea empieza como no completada
      client.rpush('tasks', JSON.stringify(newTask), (err) => {
        if (err) {
          res.writeHead(500);
          res.end('Error adding task');
          return;
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Task created' }));
      });
    });
  } else if (req.url.startsWith('/tasks/') && req.method === 'PUT') {
    // Actualizar una tarea existente (nombre o estado completado)
    const id = req.url.split('/')[2];
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const updatedTask = JSON.parse(body);
      client.lset('tasks', id, JSON.stringify(updatedTask), (err) => {
        if (err) {
          res.writeHead(500);
          res.end('Error updating task');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Task updated' }));
      });
    });
  } else if (req.url.startsWith('/tasks/') && req.method === 'DELETE') {
    // Eliminar una tarea existente
    const id = req.url.split('/')[2];
    client.lindex('tasks', id, (err, task) => {
      if (err || !task) {
        res.writeHead(404);
        res.end('Task not found');
        return;
      }
      client.lrem('tasks', 1, task, (err) => {
        if (err) {
          res.writeHead(500);
          res.end('Error deleting task');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Task deleted' }));
      });
    });
  } else if (req.url === '/completed-tasks' && req.method === 'GET') {
    // Obtener tareas completadas
    client.lrange('completed_tasks', 0, -1, (err, tasks) => {
      if (err) {
        res.writeHead(500);
        res.end('Error fetching completed tasks');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tasks.map(task => JSON.parse(task))));
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
});
