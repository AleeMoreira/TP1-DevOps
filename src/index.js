const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// Redis client setup
const client = redis.createClient({
  host: 'redis', // Host para Redis en Docker
  port: 6379
});

app.use(cors()); // Enable CORS
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.'))); // Serve the HTML file

// Endpoint para obtener todas las tareas
app.get('/tasks', (req, res) => {
  client.lrange('tasks', 0, -1, (err, tasks) => {
    if (err) {
      console.error('Error fetching tasks from Redis:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    if (!tasks || tasks.length === 0) {
      return res.json([]); // Si no hay tareas, devolver una lista vacía
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
      return res.json([]); // Si no hay tareas completadas, devolver una lista vacía
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
  console.log(updatedTaskData);
  client.lrange('tasks', 0, -1, (err, tasks) => {
    if (err) {
      return res.status(500).send('Error fetching tasks from Redis');
    }

    const taskList = tasks.map(task => JSON.parse(task));
    const taskIndex = taskList.findIndex(task => task.id === taskId);

    if (taskIndex !== -1) {
      // Actualizar el nombre de la tarea y/o su estado
      if (updatedTaskData.name) {
        taskList[taskIndex].text = updatedTaskData.name; // Actualiza el texto de la tarea
      }
      if (typeof updatedTaskData.completed !== 'undefined') {
        taskList[taskIndex].completed = updatedTaskData.completed; // Actualiza el estado de la tarea
      }
      client.del('tasks'); // Borra las tareas anteriores
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

    client.del('tasks'); // Delete old tasks
    updatedTasks.forEach(task => client.rpush('tasks', JSON.stringify(task)));

    res.send();
  });
});

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
