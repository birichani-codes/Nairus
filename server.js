// Required modules
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg'); // PostgreSQL library for DB interaction
const bodyParser = require('body-parser');
const app = express();

// Initialize dotenv
dotenv.config();

// Set the port
const PORT = process.env.PORT || 3000;

// Set the view engine (EJS for templating)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views', 'ejs'));

// Middleware for serving static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Parse incoming requests (JSON and URL-encoded data)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PostgreSQL connection setup
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Sb34106209@5715',
  database: 'Nairus',
  port: 5432,
});

// Check database connection
pool.connect()
  .then(() => console.log('Database connected successfully.'))
  .catch(err => console.error('Unable to connect to the database:', err));

// Handle form submission for quote

// API endpoint to retrieve all blogs
app.get('/api/blogs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blogs ORDER BY created_at DESC;');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API endpoint to retrieve featured blogs
app.get('/api/featured-blogs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blogs WHERE is_featured = TRUE ORDER BY created_at DESC;');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching featured blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route for the blog page (dynamic rendering)
app.get('/blog', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blogs ORDER BY created_at DESC;');
    const blogs = result.rows;
    res.render('blog', { blogs });
  } catch (error) {
    console.error('Error fetching blogs for display:', error);
    res.status(500).send('Error loading blogs.');
  }
});
// Route for the gallery page (displaying featured blogs)
app.get('/gallery', async (req, res) => {
  try {
    // Fetch 3 most recent featured blogs
    const result = await pool.query('SELECT * FROM blogs WHERE is_featured = TRUE ORDER BY created_at DESC LIMIT 3;');
    const featuredBlogs = result.rows; // Array of featured blogs

    // Render the gallery view and pass featuredBlogs data
    res.render('gallery', { featuredBlogs });
  } catch (error) {
    console.error('Error fetching featured blogs for display:', error);
    res.status(500).send('Error loading featured blogs.');
  }
});
// Route for individual blog post page
app.get('/blog/:id', async (req, res) => {
  const blogId = req.params.id; // Get the blog id from the URL
  try {
    // Fetch the blog by its ID from the database
    const result = await pool.query('SELECT * FROM blogs WHERE id = $1', [blogId]);
    const blog = result.rows[0];

    if (!blog) {
      return res.status(404).send('Blog not found');
    }

    // Fetch related blogs (e.g., based on the category or any other field)
    const relatedBlogsResult = await pool.query(
      'SELECT * FROM blogs WHERE category = $1 AND id != $2 ORDER BY created_at DESC LIMIT 3', 
      [blog.category, blogId]
    );
    const relatedBlogs = relatedBlogsResult.rows;

    // Log the data to check if the image URL is available
    console.log('Blog data:', blog);
    console.log('Related blogs data:', relatedBlogs);

    // Render the blog page with the fetched blog and related blogs
    res.render('single-blog', { blog, relatedBlogs });
  } catch (error) {
    console.error('Error fetching the blog or related blogs:', error);
    res.status(500).send('Error loading blog');
  }
});


// API endpoint to fetch all reviews
app.get('/api/testimonials', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC;');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.post('/submit-quote', async (req, res) => {
  const recaptchaToken = req.body['g-recaptcha-response']; // Get the reCAPTCHA token from the form
  const RECAPTCHA_SECRET = '6LeHXooqAAAAAA-3un9GzZE1H-qKoNkG4XaUtwPo'; // Your reCAPTCHA secret key

  // Step 1: Verify reCAPTCHA
  try {
    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET}&response=${recaptchaToken}`,
    });

    const recaptchaData = await recaptchaResponse.json();
    if (!recaptchaData.success) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed. Please try again.' });
    }
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return res.status(500).json({ error: 'Internal Server Error during reCAPTCHA verification.' });
  }

  // Step 2: Handle form submission
  const {
    firstName,
    lastName,
    email,
    destination,
    fromDate,
    toDate,
    adults,
    children = 0,
    infants = 0,
    nationality,
    comments,
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !destination || !fromDate || !toDate || !adults) {
    return res.status(400).json({ error: 'All required fields must be filled out' });
  }

  try {
    const query = `
      INSERT INTO quote_requests (
        first_name, last_name, email, destination, from_date, to_date, adults, children, infants, nationality, comments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [firstName, lastName, email, destination, fromDate, toDate, adults, children, infants, nationality, comments];
    const result = await pool.query(query, values);

    res.status(201).json({ message: 'Quote request submitted successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error inserting quote request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to render the "daily-packages" page
// Route for the daily packages page (dynamic rendering)
app.get('/daily-packages', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM packages ORDER BY created_at DESC');
    const packages = result.rows;

    // Ensure every package has an image_url, else use a placeholder
    packages.forEach(package => {
      if (!package.image_url) {
        package.image_url = 'images/default-image.jpg';  // Use a default image if no URL is provided
      }
    });

    res.render('daily-packages', { packages });
  } catch (error) {
    console.error('Error fetching packages for display:', error);
    res.status(500).send('Error loading daily packages.');
  }
});
app.get('/package/:id', async (req, res) => {
  const packageId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM packages WHERE id = $1', [packageId]);
    const package = result.rows[0]; // Assuming the query returns only one package

    if (!package) {
      return res.status(404).send('Package not found');
    }

    res.render('package-detail', { package });
  } catch (error) {
    console.error('Error fetching package details:', error);
    res.status(500).send('Error loading package details');
  }
});
// Route to display a single tour package
app.get('/tour/:id', async (req, res) => {
  const packageId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM tour_packages WHERE id = $1', [packageId]);
    if (result.rows.length > 0) {
      const tourPackage = result.rows[0];
      res.render('tour-detail', { tourPackage });
    } else {
      res.status(404).send('Tour package not found');
    }
  } catch (err) {
    console.error('Error fetching package details', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/tour/:id', async (req, res) => {
  const tourId = req.params.id;

  try {
    // Query the 'tour_packages' table to get the tour package by its ID
    const result = await pool.query('SELECT * FROM tour_packages WHERE id = $1', [tourId]);

    // Fetch the tour package details from the query result
    const tourPackage = result.rows[0];

    // Ensure image_urls is parsed as JSON if it's stored as a string
    let imageUrls = [];
    if (tourPackage.image_urls) {
      imageUrls = JSON.parse(tourPackage.image_urls); // Parse the JSON string to an array
    }

    // Render the 'tour-details' page and pass the tourPackage and image_urls as data
    res.render('tour-details', { tourPackage, image_urls: imageUrls });

  } catch (error) {
    console.error('Error fetching tour details:', error);
    res.status(500).send('Error loading the tour details');
  }
});

// server.js
app.get('/kenya', async (req, res) => {
  try {
    // Fetch all tour packages, no filter by country
    const result = await pool.query('SELECT * FROM tour_packages');
    const tourPackages = result.rows; // Array of all packages from the database

    // Render the kenya.ejs page and pass the tourPackages data
    res.render('kenya', { tourPackages });
  } catch (err) {
    console.error('Error fetching tour packages:', err);
    res.status(500).send('Internal Server Error');
  }
});


// API endpoint to submit a review
// POST API for submitting reviews (including CAPTCHA verification)
app.post('/api/testimonials', async (req, res) => {
  const { name, email, rating, feedback, recaptcha } = req.body;

  // Hardcoded reCAPTCHA secret key
  const SECRET_KEY = '6LeHXooqAAAAALnOMqJ926QGQvmoubS_I85BACH1';

  // Verify reCAPTCHA with Google's API
  try {
    const recaptchaResponse = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${SECRET_KEY}&response=${recaptcha}`,
    });

    const recaptchaData = await recaptchaResponse.json();
    console.log('reCAPTCHA Verification Response:', recaptchaData);  // Log for debugging

    if (!recaptchaData.success) {
      return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }
  } catch (error) {
    console.error('Error verifying CAPTCHA:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  // Validate required fields
  if (!name || !email || !rating || !feedback) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Insert review into the database
  try {
    const query = `
      INSERT INTO reviews (name, email, rating, feedback)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [name, email, rating, feedback];
    const result = await pool.query(query, values);

    res.status(201).json({ message: 'Review submitted successfully', review: result.rows[0] });
  } catch (error) {
    console.error('Error inserting review:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Define the route to fetch recent testimonials
app.get("/api/recent-testimonials", async (req, res) => {
  try {
    const result = await pool.query("SELECT name, rating, feedback FROM reviews ORDER BY created_at DESC LIMIT 5");
    res.json(result.rows);  // Send the reviews as JSON
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});
app.get('/', async (req, res) => {
  try {
    // Fetch the most recent 4 packages
    const recentPackagesResult = await pool.query('SELECT * FROM packages ORDER BY created_at DESC LIMIT 4');
    const recentPackages = recentPackagesResult.rows;

    // Fetch the featured 4 packages
    const featuredPackagesResult = await pool.query('SELECT * FROM packages WHERE is_featured = TRUE ORDER BY created_at DESC LIMIT 4');
    const featuredPackages = featuredPackagesResult.rows;

    // Fetch featured blogs (assuming you have a 'is_featured' column in your blogs table)
    const featuredBlogsResult = await pool.query('SELECT * FROM blogs WHERE is_featured = TRUE ORDER BY created_at DESC LIMIT 3');
    const featuredBlogs = featuredBlogsResult.rows;

    // Ensure featuredPackages is passed to the view
    res.render('index', { 
      recentPackages, 
      featuredPackages, // This is crucial
      featuredBlogs
    });
  } catch (error) {
    console.error('Error fetching data for the homepage:', error);
    res.status(500).send('Error loading the homepage.');
  }
});
// Other static routes
app.get('/', (req, res) => res.render('index'));
app.get('/who-we-are', (req, res) => res.render('who-we-are'));
app.get('/gallery', (req, res) => res.render('gallery'));
app.get('/contact-us', (req, res) => res.render('contact-us'));
app.get('/private-safaris', (req, res) => res.render('private-safaris'));
app.get('/gallery-section', (req, res) => res.render('gallery-section'));
app.get('/reviews', (req, res) => res.render('reviews'));
app.get('/daily-packages', (req, res) => res.render('daily-packages'));
app.get('/kenya', (req, res) => res.render('kenya'));
app.get('/tanzania', (req, res) => res.render('tanzania'));
app.get('/hajj-umrah', (req, res) => res.render('hajj-umrah'));






// Catch-all route for undefined paths
app.get('*', (req, res) => {
  res.status(404).render('404');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
