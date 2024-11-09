const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
      
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'unread'
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
      CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      excerpt TEXT,
      content TEXT NOT NULL,
      image_url TEXT,
      meta_title VARCHAR(255),
      meta_description TEXT,
      keywords TEXT[],
      author_id INTEGER REFERENCES users(id),
      category_id INTEGER REFERENCES categories(id),
      status VARCHAR(50) DEFAULT 'draft',
      views INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS blog_tags (
    blog_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (blog_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS related_content (
      blog_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      related_blog_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
      relevance_score FLOAT,
      CHECK (
        (project_id IS NOT NULL AND related_blog_id IS NULL) OR
        (project_id IS NULL AND related_blog_id IS NOT NULL)
      ),
      PRIMARY KEY (blog_id, project_id, related_blog_id)
    );

    
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);
      CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
      CREATE INDEX IF NOT EXISTS idx_blog_tags_blog_id ON blog_tags(blog_id);
      CREATE INDEX IF NOT EXISTS idx_blog_tags_tag_id ON blog_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_related_content_blog ON related_content(blog_id);
      CREATE INDEX IF NOT EXISTS idx_related_content_project ON related_content(project_id);
      CREATE INDEX IF NOT EXISTS idx_related_content_related_blog ON related_content(related_blog_id);
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
app.get('/api/admin/projects', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.description,
        p.category_id,
        p.image_url,
        p.created_at,
        p.status,
        c.name as category,
        COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN project_tags pt ON p.id = pt.project_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      GROUP BY p.id, c.name
      ORDER BY p.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    if (err.code === '42P01') { // Table does not exist
      return res.json([]); // Return empty array instead of 404
    }
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

// Categories routes
app.get('/api/admin/categories', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, description, created_at, updated_at
      FROM categories
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

app.post('/api/admin/categories', authenticateToken, isAdmin, async (req, res) => {
  const { name, description } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-');

  try {
    const result = await pool.query(
      `INSERT INTO categories (name, slug, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, slug, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating category' });
  }
});

app.put('/api/admin/categories/:id', authenticateToken, isAdmin, async (req, res) => {
  const { name, description } = req.body;
  const categoryId = req.params.id;
  const slug = name.toLowerCase().replace(/\s+/g, '-');

  try {
    const result = await pool.query(
      `UPDATE categories
       SET name = $1, slug = $2, description = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, slug, description, categoryId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating category' });
  }
});

app.delete('/api/admin/categories/:id', authenticateToken, isAdmin, async (req, res) => {
  const categoryId = req.params.id;

  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting category' });
  }
});

// User Settings routes
app.get('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT us.*, u.username, u.email 
       FROM user_settings us 
       JOIN users u ON us.user_id = u.id 
       WHERE user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Create default settings if none exist
      const defaultSettings = await pool.query(
        `INSERT INTO user_settings (user_id, theme, language, email_notifications)
         VALUES ($1, 'light', 'en', true)
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
  const { username, email, theme, language, emailNotifications } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update user profile
    await client.query(
      `UPDATE users 
       SET username = $1, email = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [username, email, req.user.id]
    );

    // Update or insert user settings
    const result = await client.query(
      `INSERT INTO user_settings (user_id, theme, language, email_notifications)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         theme = EXCLUDED.theme,
         language = EXCLUDED.language,
         email_notifications = EXCLUDED.email_notifications,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, theme, language, emailNotifications]
    );

    await client.query('COMMIT');

    const updatedUser = {
      ...result.rows[0],
      username,
      email,
    };

    res.json(updatedUser);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error updating user settings' });
  } finally {
    client.release();
  }
});

// Public project routes
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.description,
        p.image_url,
        p.created_at,
        c.name as category,
        COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN project_tags pt ON p.id = pt.project_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      GROUP BY p.id, c.name, p.created_at
      ORDER BY p.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    if (err.code === '42P01') { // Table does not exist
      return res.json([]); // Return empty array instead of 404
    }
    res.status(500).json({ error: 'Error fetching projects' });
  }
});

// Blog routes
app.get('/api/blog-posts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        bp.id,
        bp.title,
        bp.slug,
        bp.excerpt,
        bp.image_url,
        bp.created_at,
        bp.views,
        u.username as author,
        c.name as category,
        COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags,
        COALESCE(array_agg(DISTINCT jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'image_url', p.image_url
        )) FILTER (WHERE p.id IS NOT NULL), ARRAY[]::jsonb[]) as related_projects
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      LEFT JOIN categories c ON bp.category_id = c.id
      LEFT JOIN blog_tags bt ON bp.id = bt.blog_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      LEFT JOIN related_content rc ON bp.id = rc.blog_id
      LEFT JOIN projects p ON rc.project_id = p.id
      WHERE bp.status = 'published'
      GROUP BY bp.id, u.username, c.name
      ORDER BY bp.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching blog posts' });
  }
});

app.get('/api/blog-posts/:slug', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        bp.*,
        u.username as author,
        c.name as category,
        COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags,
        COALESCE(array_agg(DISTINCT jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'image_url', p.image_url
        )) FILTER (WHERE p.id IS NOT NULL), ARRAY[]::jsonb[]) as related_projects
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      LEFT JOIN categories c ON bp.category_id = c.id
      LEFT JOIN blog_tags bt ON bp.id = bt.blog_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      LEFT JOIN related_content rc ON bp.id = rc.blog_id
      LEFT JOIN projects p ON rc.project_id = p.id
      WHERE bp.slug = $1 AND bp.status = 'published'
      GROUP BY bp.id, u.username, c.name
    `, [req.params.slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Increment view count
    await pool.query(
      'UPDATE blog_posts SET views = views + 1 WHERE id = $1',
      [result.rows[0].id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching blog post' });
  }
});

// Admin blog routes
app.post('/api/admin/blog-posts', authenticateToken, isAdmin, async (req, res) => {
  const { 
    title, 
    content, 
    excerpt,
    image_url,
    category_id,
    tags,
    meta_title,
    meta_description,
    keywords,
    status = 'draft'
  } = req.body;

  // Validate required fields
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Content is required and must be a non-empty string' });
  }

  const slug = title.toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if slug already exists
    const slugCheck = await client.query(
      'SELECT id FROM blog_posts WHERE slug = $1',
      [slug]
    );

    if (slugCheck.rows.length > 0) {
      throw new Error('A blog post with this title already exists');
    }

    // Insert blog post
    const blogResult = await client.query(
      `INSERT INTO blog_posts (
        title, 
        slug, 
        content, 
        excerpt, 
        image_url, 
        category_id, 
        author_id,
        meta_title,
        meta_description,
        keywords,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        title.trim(),
        slug,
        content.trim(),
        excerpt?.trim() || null,
        image_url || null,
        category_id || null,
        req.user.id,
        meta_title?.trim() || title.trim(),
        meta_description?.trim() || excerpt?.trim() || null,
        keywords || [],
        status
      ]
    );

    const blogId = blogResult.rows[0].id;

    // Handle tags if present
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        if (typeof tagName !== 'string' || !tagName.trim()) continue;
        
        // Insert or get tag
        const tagResult = await client.query(
          `INSERT INTO tags (name, slug)
           VALUES ($1, $2)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [tagName.trim(), tagName.toLowerCase().trim().replace(/\s+/g, '-')]
        );
        
        // Link tag to blog post
        await client.query(
          `INSERT INTO blog_tags (blog_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [blogId, tagResult.rows[0].id]
        );
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({ 
      message: 'Blog post created successfully', 
      id: blogId,
      slug: slug
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating blog post:', err);
    
    if (err.message === 'A blog post with this title already exists') {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ 
      error: 'Error creating blog post', 
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// Add file upload endpoint
app.post('/api/upload', authenticateToken, async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.files.file;
  const fileName = `${Date.now()}-${file.name}`;
  const uploadPath = path.join(__dirname, '../uploads', fileName);

  try {
    await file.mv(uploadPath);
    res.json({ 
      url: `/uploads/${fileName}`,
      message: 'File uploaded successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

// Contact route
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await pool.query(
      `INSERT INTO contact_messages (name, email, message)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [name, email, message]
    );

    // Here you could add email notification logic using nodemailer
    
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error sending message' });
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