// index.js
const express = require('express');
const mysql = require('mysql2/promise'); // Use the promise-based version
const bcrypt=require('bcrypt')
const jwt=require("jsonwebtoken")
const {v4: uuidv4}=require('uuid')
// Initialize the Express application
const app = express();
app.use(express.json());

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',            // Database host (localhost for local server)
  user: 'root',                 // Username
  password: 'Il0vey0uallah',    // Your password
  database: 'dummytodos'          // Your database name
});

const authenticateToken=(request,response,next)=>{
  let jwtToken;
  const authHeader=request.headers['authorization']
  if(authHeader!==undefined) {
    jwtToken=authHeader.split(" ")[1]
  }
  if(jwtToken===undefined){
    response.send("Invalid credentials").status(401)
  }
  else{
    jwt.verify(jwtToken,"SECRET_TOKEN",(err,payload)=>{
      if(err){
        response.send("Invalid credentials").status(401)
      }
      else{
        request.mobile=payload.mobile
        next()
      }
    })
  }

}

app.post("/register/", async (request, response) => {
  const { name, password, gender, mobile, email } = request.body;
  const [dbUser] = await pool.query('SELECT * FROM users WHERE name = ?', [name]);
  const hashedPassword = await bcrypt.hash(password, 10);
  
  if (dbUser.length === 0) {
    // Add user to db
    await pool.query(
      'INSERT INTO users (name, gender, email, mobile, password) VALUES (?, ?, ?, ?, ?)',
      [name, gender, email, mobile, hashedPassword]
    );

    response.status(200).send({ message: "Created new user successfully" });
  } else {
    response.status(409).json({ message: 'User already exists' });
  }
});


app.post("/login/",async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const [result] = await pool.query('SELECT * FROM users WHERE mobile =? ', [mobile]);
    const dbUser=result[0]
    if (result.length > 0) {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if(isPasswordMatched){
        const payload={mobile:dbUser.mobile}
        const jwtToken=jwt.sign(payload,"SECRET_TOKEN")
        res.json({ message: 'Login successful' ,jwtToken}).status(200);
      }
      else{
        res.status(401).json({ message: 'Invalid password' });
      }
      
    } else {
      res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message }); // Handle errors
  }
})


app.get('/users/',authenticateToken, async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM users'); // Query the pizzas table
    res.json(results); // Send the results as a JSON response
  } catch (err) {
    res.status(500).json({ error: err.message }); // Handle errors
  }
});


app.get('/todos/',authenticateToken, async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM todos'); // Query the orders table
    res.json(results); // Send the results as a JSON response
  } catch (err) {
    res.status(500).json({ error: err.message }); // Handle errors
  }
});

app.post("/todos/",authenticateToken, async (request, response) => {
  const { task, tag, priority, status } = request.body; // No need for `date`, it's handled by `now()`
  const generatedId = uuidv4();
  console.log(generatedId);

  try {
    const [addTodo] = await pool.query(
      'INSERT INTO todos (id, task, tag, priority, status, date) VALUES (?, ?, ?, ?, ?, CURDATE())',
      [generatedId, task, tag, priority, status]
    );

  
    response.status(201).json({ message: 'Todo added successfully', id: generatedId });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: error.message });
  }
});





app.put("/todo/:todoId",authenticateToken, async (request, response) => {
  const { task } = request.body;
  const { todoId } = request.params;

  try {
    const [updateQuery] = await pool.query('UPDATE todos SET task=? WHERE id=?', [task, todoId]);

    if (updateQuery.affectedRows > 0) {
      response.status(200).json({ message: 'Task updated successfully' });
    } else {
      response.status(404).json({ message: 'Todo not found' });
    }
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: error.message });
  }
});




app.delete("/delete-todo/",authenticateToken,async (req, res) => {
  try{
    const { id } = req.body;
    const [result]=await pool.query('delete from todos where id=?',[id])
    console.log(result)
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Todo not found' }); // No matching record
    }
    
    res.json({message: 'Todo deleted successfully'}).status(200);
    
  }
  catch(error){
    res.status(500).json({ error: error.message }); // Handle errors
  }
})

app.delete("/delete-todos/",authenticateToken,async (req, res) => {
  try{
    
  await pool.query('delete from todos')
  
    
    res.json({message: 'Todos deleted successfully'}).status(200);
    
  }
  catch(error){
    res.status(500).json({ error: error.message }); // Handle errors
  }
})

app.delete("/delete-users/",authenticateToken,async (req, res) => {
  try{
    const [result]=await pool.query('delete from users')
    
      res.json({message: 'users deleted successfully'}).status(200);
    
    
  }
  catch(error){
    res.status(500).json({ error: error.message }); // Handle errors
  }
})

// Start the Express server
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
