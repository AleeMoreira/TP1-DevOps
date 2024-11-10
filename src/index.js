const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const promclient = require('prom-client');

const app = express();
const port = 3000;

const crypto = require('crypto');

// Función de alto consumo de CPU
function consumeCPU() {
  const maxIterations = 10;
  let count = 0;

  const intervalId = setInterval(() => {
    crypto.pbkdf2Sync('secret', 'salt', 10000000, 64, 'sha512');
    console.log('Consuming CPU...', `Iteration: ${count + 1}`);
    count++;

    if (count >= maxIterations) {
      clearInterval(intervalId);
      console.log(`Stopped consuming CPU after ${maxIterations} iterations`);
    }
  }, 1000);
}

// Endpoint para iniciar el consumo de CPU
app.post('/consume-cpu', (req, res) => {
  consumeCPU();
  res.sendStatus(200);
});

// Configuración de Redis
const client = redis.createClient({
  host: 'redis',
  port: 6379
});

// Configuración de Prometheus
const collectDefaultMetrics = promclient.collectDefaultMetrics;
collectDefaultMetrics();

// Contador de solicitudes HTTP
const httpRequestsTotal = new promclient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path']
});

// Middleware para contar cada solicitud HTTP
app.use((req, res, next) => {
  httpRequestsTotal.inc({ method: req.method, path: req.path });
  next();
});

// Endpoint para exponer métricas
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promclient.register.contentType);
    res.end(await promclient.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// Endpoint para obtener todas las tareas
app.get('/tasks', (req, res) => {
  client.lrange('tasks', 0, -1, (err, tasks) => {
    if (err) {
      console.error('Error fetching tasks from Redis:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
    if (!tasks || tasks.length === 0) {
      return res.json([]);
    }
    try {
      const parsedTasks = tasks.map(task => JSON.parse(task));
      res.json(parsedTasks);
    } catch (error) {
      console.error('Error parsing tasks:', error);
      res.status(500).json({ message: 'Error parsing tasks', error });
    }
  });
});

// Endpoint para obtener las tareas completadas
app.get('/tasks/completed', (req, res) => {
  client.lrange('tasks', 0, -1, (err, tasks) => {
    if (err) {
      return res.status(500).send('Error fetching tasks from Redis');
    }
    if (!tasks) {
      return res.json([]);
    }
    const parsedTasks = tasks
      .map(task => JSON.parse(task))
      .filter(task => task.completed);
    res.json(parsedTasks);
  });
});

// Endpoint para añadir una nueva tarea
app.post('/tasks', (req, res) => {
  const newTask = {
    id: uuidv4(),
    text: req.body.task,
    completed: false
  };
  client.rpush('tasks', JSON.stringify(newTask), (err) => {
    if (err) {
      console.error('Error adding task:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
    res.status(201).json(newTask);
  });
});

// Endpoint para actualizar una tarea
app.put('/tasks/:id', (req, res) => {
  const taskId = req.params.id;
  const updatedTaskData = req.body;
  client.lrange('tasks', 0, -1, (err, tasks) => {
    if (err) {
      return res.status(500).send('Error fetching tasks from Redis');
    }
    const taskList = tasks.map(task => JSON.parse(task));
    const taskIndex = taskList.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      if (updatedTaskData.name) {
        taskList[taskIndex].text = updatedTaskData.name;
      }
      if (typeof updatedTaskData.completed !== 'undefined') {
        taskList[taskIndex].completed = updatedTaskData.completed;
      }
      client.del('tasks');
      taskList.forEach(task => client.rpush('tasks', JSON.stringify(task)));
      res.send();
    } else {
      res.status(404).send('Task not found');
    }
  });
});

// Endpoint para borrar una tarea
app.delete('/tasks/:id', (req, res) => {
  const taskId = req.params.id;
  client.lrange('tasks', 0, -1, (err, tasks) => {
    if (err) {
      return res.status(500).send('Error fetching tasks from Redis');
    }
    const taskList = tasks.map(task => JSON.parse(task));
    const updatedTasks = taskList.filter(task => task.id !== taskId);
    client.del('tasks');
    updatedTasks.forEach(task => client.rpush('tasks', JSON.stringify(task)));
    res.send();
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
