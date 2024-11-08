const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // First connect as superuser to grant permissions
    await client.query(`
      DO
      $do$
      BEGIN
         IF NOT EXISTS (
            SELECT FROM pg_catalog.pg_roles WHERE rolname = '${process.env.DB_USER}'
         ) THEN
            CREATE USER ${process.env.DB_USER};
         END IF;
      END
      $do$;

      -- Grant all privileges on database
      GRANT ALL PRIVILEGES ON DATABASE ${process.env.DB_DATABASE} TO ${process.env.DB_USER};
      
      -- Grant usage on schema
      GRANT USAGE ON SCHEMA public TO ${process.env.DB_USER};
      
      -- Grant all privileges on all tables
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${process.env.DB_USER};
      
      -- Grant all privileges on all sequences
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${process.env.DB_USER};
      
      -- Grant execute on all functions
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${process.env.DB_USER};

      -- Ensure privileges on future tables
      ALTER DEFAULT PRIVILEGES IN SCHEMA public 
      GRANT ALL PRIVILEGES ON TABLES TO ${process.env.DB_USER};
      
      ALTER DEFAULT PRIVILEGES IN SCHEMA public 
      GRANT ALL PRIVILEGES ON SEQUENCES TO ${process.env.DB_USER};
      
      ALTER DEFAULT PRIVILEGES IN SCHEMA public 
      GRANT ALL PRIVILEGES ON FUNCTIONS TO ${process.env.DB_USER};
    `);

    // Then create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category_id INTEGER REFERENCES categories(id),
        image_url TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS project_tags (
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'light',
        email_notifications BOOLEAN DEFAULT true,
        language VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);
      CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
    `);
    
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}


// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)',
      [username, email, hashedPassword, 'user']
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error logging in' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

// Admin routes
app.get('/api/admin/dashboard', authenticateToken, isAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count
      FROM users
    `);

    res.json({
      message: 'Welcome to admin dashboard',
      statistics: stats.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching dashboard data' });
  }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, role FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

app.put('/api/admin/users/:id/role', authenticateToken, isAdmin, async (req, res) => {
  const { role } = req.body;
  const userId = req.params.id;

  try {
    await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [role, userId]
    );
    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating user role' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  const userId = req.params.id;

  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting user' });
  }
});

// Project routes
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
             array_agg(t.name) as tags,
             c.name as category_name
      FROM projects p
      LEFT JOIN project_tags pt ON p.id = pt.project_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN categories c ON p.category_id = c.id
      GROUP BY p.id, c.name
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching projects' });
  }
});

app.post('/api/admin/projects', authenticateToken, isAdmin, async (req, res) => {
  const { title, description, category_id, tags, image_url } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const projectResult = await client.query(
      `INSERT INTO projects (title, description, category_id, image_url, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [title, description, category_id, image_url, req.user.id]
    );

    const projectId = projectResult.rows[0].id;

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tagResult = await client.query(
          `INSERT INTO tags (name, slug)
           VALUES ($1, $2)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [tagName, tagName.toLowerCase().replace(/\s+/g, '-')]
        );

        const tagId = tagResult.rows[0].id;

        await client.query(
          `INSERT INTO project_tags (project_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [projectId, tagId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Project created successfully', id: projectId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error creating project' });
  } finally {
    client.release();
  }
});

app.put('/api/admin/projects/:id', authenticateToken, isAdmin, async (req, res) => {
  const { title, description, category_id, tags, image_url } = req.body;
  const projectId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE projects
       SET title = $1, description = $2, category_id = $3, image_url = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [title, description, category_id, image_url, projectId]
    );

    await client.query('DELETE FROM project_tags WHERE project_id = $1', [projectId]);

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tagResult = await client.query(
          `INSERT INTO tags (name, slug)
           VALUES ($1, $2)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [tagName, tagName.toLowerCase().replace(/\s+/g, '-')]
        );

        const tagId = tagResult.rows[0].id;

        await client.query(
          `INSERT INTO project_tags (project_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [projectId, tagId]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Project updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error updating project' });
  } finally {
    client.release();
  }
});

app.delete('/api/admin/projects/:id', authenticateToken, isAdmin, async (req, res) => {
  const projectId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM project_tags WHERE project_id = $1', [projectId]);
    await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
    await client.query('COMMIT');
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error deleting project' });
  } finally {
    client.release();
  }
});



// Start server
async function startServer() {
  try {
    await initializeDatabase();
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// User settings routes
app.get('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Create default settings if they don't exist
      const defaultSettings = await pool.query(
        `INSERT INTO user_settings (user_id) 
         VALUES ($1) 
         RETURNING *`,
        [req.user.id]
      );
      return res.json(defaultSettings.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching user settings' });
  }
});

app.put('/api/user/settings', authenticateToken, async (req, res) => {
  const { theme, language, emailNotifications } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update user settings
    await client.query(
      `INSERT INTO user_settings (user_id, theme, language, email_notifications)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         theme = EXCLUDED.theme,
         language = EXCLUDED.language,
         email_notifications = EXCLUDED.email_notifications,
         updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, theme, language, emailNotifications]
    );

    // Update user profile if provided
    if (req.body.username || req.body.email) {
      const updates = [];
      const values = [];
      let valueIndex = 1;

      if (req.body.username) {
        updates.push(`username = $${valueIndex}`);
        values.push(req.body.username);
        valueIndex++;
      }

      if (req.body.email) {
        updates.push(`email = $${valueIndex}`);
        values.push(req.body.email);
        valueIndex++;
      }

      values.push(req.user.id);
      await client.query(
        `UPDATE users 
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $${valueIndex}
         RETURNING id, username, email, role`,
        values
      );
    }

    await client.query('COMMIT');

    const userResult = await client.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json(userResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error updating user settings' });
  } finally {
    client.release();
  }
});

// Project routes
app.get('/api/projects', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
             array_agg(t.name) as tags,
             c.name as category_name
      FROM projects p
      LEFT JOIN project_tags pt ON p.id = pt.project_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN categories c ON p.category_id = c.id
      GROUP BY p.id, c.name
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching projects' });
  }
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
  } catch(err) {
    console.error('Error closing database pool:', err);
    process.exit(1);
  }
});

startServer();